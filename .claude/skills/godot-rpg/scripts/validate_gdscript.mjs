#!/usr/bin/env node
// godot-rpg — validador GDScript (comprobar-primero, cascada, sin deps).
//
// Uso:  node validate_gdscript.mjs <archivo.gd|dir> [<archivo.gd|dir> ...] [--method=auto|gdlint|godot|ligero]
//
// Estrategia en cascada (usa lo que esté disponible en ESTA máquina, de mejor a peor):
//   1. gdlint (gdtoolkit) — si está en PATH o en el venv EGO (E:/skill/ego/.venv/Scripts).
//   2. godot --headless --check-only --script <f> — si hay un Godot presente (PATH o
//      C:/Users/h/Desktop/godot2). Verificado a mano contra Godot 4.3-stable mono real en esta
//      máquina: exit 0 si el script parsea limpio; exit 1 + stderr con
//        "SCRIPT ERROR: Parse Error: <msg>"
//        "          at: GDScript::reload (<path>:<line>)"
//      cuando hay un error de sintaxis. No hace falta project.godot ni --quit: el proceso
//      termina solo tras el check.
//   3. lint-ligero — fallback SIEMPRE disponible (cero dependencias): tabs/espacios mezclados,
//      balance de (), [], {}, ':' final donde toca (func/if/elif/else/for/while/match/class),
//      indentación consistente en todo el archivo, strings sin cerrar.
//
// Salida: por archivo, "OK" o lista de {linea, problema}. Exit 0 si todo OK, 1 si hay problemas
// (o si no se encontró ningún .gd que validar). Siempre se informa qué método se usó.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { platform } from 'node:os';
import { spawnSync } from 'node:child_process';

const IS_WIN = platform() === 'win32';

// ─── utilidades de localización (comprobar-primero) ────────────────────────

function which(name) {
  const dirs = (process.env.PATH || '').split(IS_WIN ? ';' : ':').filter(Boolean);
  const exts = IS_WIN ? (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';') : [''];
  for (const dir of dirs) {
    const bare = join(dir, name);
    try { if (statSync(bare).isFile()) return bare; } catch {}
    if (IS_WIN) {
      for (const ext of exts) {
        const withExt = join(dir, name.toLowerCase().endsWith(ext.toLowerCase()) ? name : name + ext);
        try { if (statSync(withExt).isFile()) return withExt; } catch {}
      }
    }
  }
  return null;
}

function findGdlint() {
  if (process.env.GDLINT_BIN && existsSync(process.env.GDLINT_BIN)) return process.env.GDLINT_BIN;
  const onPath = which('gdlint');
  if (onPath) return onPath;
  // venv EGO conocido (comprobar-primero: solo existsSync, nunca instalar aquí)
  const venvCandidates = [
    join('E:', 'skill', 'ego', '.venv', 'Scripts', 'gdlint.exe'),
    join('E:', 'skill', 'ego', '.venv', 'Scripts', 'gdlint.cmd'),
    join('E:', 'skill', 'ego', '.venv', 'bin', 'gdlint'),
  ];
  for (const c of venvCandidates) { if (existsSync(c)) return c; }
  return null;
}

// Búsqueda acotada (profundidad y nº de entradas máximos) para no recorrer discos enteros.
function findExeUnder(root, namePattern, maxDepth = 6, maxEntries = 40000) {
  if (!existsSync(root)) return [];
  const matches = [];
  const stack = [{ dir: root, depth: 0 }];
  let seen = 0;
  while (stack.length && seen < maxEntries) {
    const { dir, depth } = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      seen++;
      if (seen >= maxEntries) break;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        if (depth < maxDepth) stack.push({ dir: full, depth: depth + 1 });
      } else if (namePattern.test(e.name)) {
        matches.push(full);
      }
    }
  }
  return matches;
}

function findGodot() {
  if (process.env.GODOT_BIN && existsSync(process.env.GODOT_BIN)) return process.env.GODOT_BIN;
  const onPath = which('godot') || which('godot4');
  if (onPath) return onPath;
  // ubicación conocida en esta máquina (comprobar-primero, sin instalar nada)
  const root = 'C:\\Users\\h\\Desktop\\godot2';
  const matches = findExeUnder(root, /^godot.*\.exe$/i);
  if (!matches.length) return null;
  const nonConsole = matches.find((m) => !/console/i.test(m));
  return nonConsole || matches[0];
}

// ─── recolección de archivos .gd ────────────────────────────────────────────

function collectGdFiles(inputPath) {
  const st = statSync(inputPath);
  if (st.isFile()) return [inputPath];
  const skipDirs = new Set(['.git', '.godot', '.import']);
  const out = [];
  const stack = [inputPath];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!skipDirs.has(e.name)) stack.push(join(dir, e.name));
      } else if (/\.gd$/i.test(e.name)) {
        out.push(join(dir, e.name));
      }
    }
  }
  return out;
}

// ─── método 3: lint-ligero (siempre disponible, sin deps) ──────────────────
//
// Un único paso por los caracteres del archivo con una máquina de estados simple
// (code / string simple o doble / string triple), que va acumulando:
//   - balance de brackets (con línea de apertura, para señalar el que quedó sin cerrar)
//   - strings sin cerrar (single-line que no cierran antes del salto de línea)
//   - profundidad de brackets al inicio/fin de cada línea (para el chequeo de ':')
//   - tipo de indentación de cada línea (tab / espacio / mezclada en la misma línea)
function lintLigero(text) {
  const lines = text.split(/\r\n|\r|\n/);
  const problems = [];

  const OPEN = { '(': ')', '[': ']', '{': '}' };
  const CLOSE = { ')': '(', ']': '[', '}': '{' };

  const stack = []; // {ch, line}
  const codeOnlyByLine = new Array(lines.length).fill('');
  const depthAtStart = new Array(lines.length).fill(0);
  const depthAtEnd = new Array(lines.length).fill(0);
  const indentTypeByLine = new Array(lines.length).fill(null); // 'tab' | 'space' | null

  let state = 'code'; // 'code' | 'squote' | 'dquote' | 'triple_s' | 'triple_d'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    depthAtStart[i] = stack.length;

    // indentación (solo tiene sentido evaluarla si esta línea arranca en estado 'code',
    // es decir, no es continuación de un string triple de la línea anterior)
    if (state === 'code') {
      const m = line.match(/^[ \t]*/);
      const leading = m ? m[0] : '';
      if (leading.length > 0 && line.trim() !== '') {
        const hasTab = leading.includes('\t');
        const hasSpace = leading.includes(' ');
        if (hasTab && hasSpace) {
          problems.push({ linea: i + 1, problema: 'indentación mezcla tabs y espacios en la misma línea' });
        } else if (hasTab) {
          indentTypeByLine[i] = 'tab';
        } else if (hasSpace) {
          indentTypeByLine[i] = 'space';
        }
      }
    }

    let j = 0;
    let codeOnly = '';
    while (j < line.length) {
      const ch = line[j];
      if (state === 'code') {
        if (ch === '#') break; // resto de la línea es comentario
        if (line.startsWith('"""', j)) { state = 'triple_d'; j += 3; continue; }
        if (line.startsWith("'''", j)) { state = 'triple_s'; j += 3; continue; }
        if (ch === '"') { state = 'dquote'; j += 1; continue; }
        if (ch === "'") { state = 'squote'; j += 1; continue; }
        if (OPEN[ch]) { stack.push({ ch, line: i + 1 }); codeOnly += ch; j += 1; continue; }
        if (CLOSE[ch]) {
          const top = stack[stack.length - 1];
          if (!top || top.ch !== CLOSE[ch]) {
            problems.push({ linea: i + 1, problema: `'${ch}' de cierre sin apertura correspondiente` });
          } else {
            stack.pop();
          }
          codeOnly += ch; j += 1; continue;
        }
        codeOnly += ch; j += 1; continue;
      } else if (state === 'squote' || state === 'dquote') {
        const quote = state === 'dquote' ? '"' : "'";
        if (ch === '\\') { j += 2; continue; }
        if (ch === quote) { state = 'code'; j += 1; continue; }
        j += 1; continue;
      } else { // triple_s / triple_d
        const triple = state === 'triple_d' ? '"""' : "'''";
        if (line.startsWith(triple, j)) { state = 'code'; j += 3; continue; }
        j += 1; continue;
      }
    }

    if (state === 'squote' || state === 'dquote') {
      problems.push({ linea: i + 1, problema: 'string sin cerrar' });
      state = 'code'; // recupera para no arrastrar falsos positivos al resto del archivo
    }

    codeOnlyByLine[i] = codeOnly;
    depthAtEnd[i] = stack.length;
  }

  // brackets que quedaron abiertos al final del archivo
  for (const entry of stack) {
    problems.push({ linea: entry.line, problema: `'${entry.ch}' sin cerrar` });
  }
  // string triple sin cerrar al final del archivo
  if (state === 'triple_s' || state === 'triple_d') {
    problems.push({ linea: lines.length, problema: "bloque de string/comentario triple (''' o \"\"\") sin cerrar" });
  }

  // ':' final donde toca (func/if/elif/else/for/while/match/class), solo para líneas
  // "autocontenidas" a nivel de brackets (no continúan una firma multilínea)
  const BLOCK_KW = /^(func|if|elif|else|for|while|match|class)\b/;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = codeOnlyByLine[i].trim();
    if (!trimmed) continue;
    if (!BLOCK_KW.test(trimmed)) continue;
    if (depthAtStart[i] !== 0 || depthAtEnd[i] !== 0) continue; // firma multilínea: no evaluar aquí
    if (!trimmed.includes(':')) {
      problems.push({ linea: i + 1, problema: "falta ':' en un bloque func/if/elif/else/for/while/match/class" });
    }
  }

  // indentación consistente en todo el archivo (tabs en unas líneas, espacios en otras)
  let tabs = 0, spaces = 0;
  for (const t of indentTypeByLine) { if (t === 'tab') tabs++; else if (t === 'space') spaces++; }
  if (tabs > 0 && spaces > 0) {
    const majority = tabs >= spaces ? 'tab' : 'space';
    const minorLabel = majority === 'tab' ? 'espacios' : 'tabs';
    const majorLabel = majority === 'tab' ? 'tabs' : 'espacios';
    for (let i = 0; i < indentTypeByLine.length; i++) {
      if (indentTypeByLine[i] && indentTypeByLine[i] !== majority) {
        problems.push({
          linea: i + 1,
          problema: `indentación inconsistente: usa ${minorLabel} pero el resto del archivo usa ${majorLabel}`,
        });
      }
    }
  }

  problems.sort((a, b) => a.linea - b.linea);
  return problems;
}

// ─── método 1: gdlint ───────────────────────────────────────────────────────

function runGdlint(gdlintPath, file) {
  const res = spawnSync(gdlintPath, [file], { encoding: 'utf8', windowsHide: true });
  if (res.error) return { unusable: true, problems: [], raw: String(res.error) };
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  if (res.status === 0) return { unusable: false, problems: [], raw: out };
  const problems = [];
  const re = /:(\d+):\s*(.+)/g;
  let m;
  while ((m = re.exec(out))) {
    problems.push({ linea: Number(m[1]), problema: m[2].trim() });
  }
  if (!problems.length) {
    // no se pudo parsear el formato de salida; reporta el bloque crudo como un único problema
    const raw = out.trim();
    if (raw) problems.push({ linea: 0, problema: raw.split('\n')[0].trim() });
  }
  return { unusable: false, problems, raw: out };
}

// ─── método 2: godot --headless --check-only --script <f> ─────────────────

function runGodotCheck(godotPath, file) {
  const res = spawnSync(
    godotPath,
    ['--headless', '--check-only', '--script', file],
    { encoding: 'utf8', windowsHide: true, timeout: 20000 },
  );
  if (res.error) return { unusable: true, timeout: false, problems: [], raw: String(res.error) };
  if (res.signal || res.status === null) {
    return { unusable: false, timeout: true, problems: [{ linea: 0, problema: 'timeout ejecutando godot --check-only' }], raw: '' };
  }
  const stderr = res.stderr || '';
  if (res.status === 0) return { unusable: false, timeout: false, problems: [], raw: stderr };

  const problems = [];
  const errLines = stderr.split(/\r?\n/);
  for (let i = 0; i < errLines.length; i++) {
    const scriptErr = errLines[i].match(/^SCRIPT ERROR:\s*(.+)$/);
    if (scriptErr) {
      const next = errLines[i + 1] || '';
      // el path entre paréntesis puede traer sus propios ':' (unidad de disco "C:", esquema
      // "res://"...), así que capturamos con avidez y nos quedamos con el ÚLTIMO ":<número>)".
      const at = next.match(/at:\s*GDScript::reload\s*\((.*):(\d+)\)/);
      if (at) {
        problems.push({ linea: Number(at[2]), problema: scriptErr[1].trim() });
      } else {
        problems.push({ linea: 0, problema: scriptErr[1].trim() });
      }
    }
  }
  if (!problems.length) {
    // godot falló pero no en el formato "SCRIPT ERROR" esperado (p.ej. archivo no encontrado,
    // fallo de carga genérico): reporta la primera línea de ERROR como problema.
    const genericErr = errLines.find((l) => /^ERROR:/.test(l));
    problems.push({ linea: 0, problema: (genericErr || stderr.trim().split('\n')[0] || 'godot --check-only falló').trim() });
  }
  return { unusable: false, timeout: false, problems, raw: stderr };
}

// ─── main ────────────────────────────────────────────────────────────────

function main() {
  const argv = process.argv.slice(2);
  const forceMethodArg = argv.find((a) => a.startsWith('--method='));
  const forceMethod = forceMethodArg ? forceMethodArg.split('=')[1] : 'auto';
  const positional = argv.filter((a) => !a.startsWith('--'));

  if (!positional.length) {
    process.stderr.write('Uso: node validate_gdscript.mjs <archivo.gd|dir> [...] [--method=auto|gdlint|godot|ligero]\n');
    process.exit(1);
  }

  let files = [];
  for (const p of positional) {
    const abs = resolve(p);
    if (!existsSync(abs)) {
      process.stderr.write(`[validate_gdscript] no existe: ${p}\n`);
      process.exit(1);
    }
    files = files.concat(collectGdFiles(abs));
  }
  files = [...new Set(files)];

  if (!files.length) {
    process.stderr.write('[validate_gdscript] no se encontró ningún archivo .gd para validar.\n');
    process.exit(1);
  }

  // ─ decide método (cascada, comprobar-primero) ─
  let method = 'lint-ligero';
  let gdlintPath = null;
  let godotPath = null;

  if (forceMethod === 'gdlint') {
    gdlintPath = findGdlint();
    method = gdlintPath ? 'gdlint' : 'lint-ligero';
  } else if (forceMethod === 'godot') {
    godotPath = findGodot();
    method = godotPath ? 'godot --check-only' : 'lint-ligero';
  } else if (forceMethod === 'ligero') {
    method = 'lint-ligero';
  } else {
    gdlintPath = findGdlint();
    if (gdlintPath) {
      method = 'gdlint';
    } else {
      godotPath = findGodot();
      if (godotPath) method = 'godot --check-only';
    }
  }

  let godotDemoted = false;
  const results = []; // {file, problems: [{linea, problema}]}

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    let problems;

    if (method === 'gdlint' && !godotDemoted) {
      const r = runGdlint(gdlintPath, file);
      if (r.unusable) {
        process.stderr.write(`[validate_gdscript] gdlint no se pudo ejecutar (${r.raw}); usando lint-ligero para el resto.\n`);
        method = 'lint-ligero';
        problems = lintLigero(readFileSync(file, 'utf8'));
      } else {
        problems = r.problems;
      }
    } else if (method === 'godot --check-only' && !godotDemoted) {
      const r = runGodotCheck(godotPath, file);
      if (r.unusable) {
        process.stderr.write(`[validate_gdscript] godot --check-only no se pudo ejecutar en este entorno (${r.raw}); usando lint-ligero para todo el lote.\n`);
        godotDemoted = true;
        method = 'lint-ligero';
        // re-procesa también los archivos ya evaluados con godot bajo lint-ligero, para reportar homogéneo
        for (const prev of results) {
          prev.problems = lintLigero(readFileSync(prev.file, 'utf8'));
        }
        problems = lintLigero(readFileSync(file, 'utf8'));
      } else {
        problems = r.problems;
      }
    } else {
      problems = lintLigero(readFileSync(file, 'utf8'));
    }

    results.push({ file, problems });
  }

  // ─ reporte ─
  let anyProblem = false;
  for (const { file, problems } of results) {
    const label = relative(process.cwd(), file).split(sep).join('/') || file;
    if (!problems.length) {
      process.stdout.write(`${label}: OK\n`);
    } else {
      anyProblem = true;
      process.stdout.write(`${label}: PROBLEMAS\n`);
      for (const p of problems) {
        const where = p.linea > 0 ? `línea ${p.linea}` : 'general';
        process.stdout.write(`  - ${where}: ${p.problema}\n`);
      }
    }
  }

  process.stdout.write(`\n[validate_gdscript] método usado: ${method}\n`);
  process.stdout.write(`[validate_gdscript] archivos: ${results.length}, con problemas: ${results.filter((r) => r.problems.length).length}\n`);

  process.exit(anyProblem ? 1 : 0);
}

main();
