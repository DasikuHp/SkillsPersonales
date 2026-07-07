#!/usr/bin/env node
// EGO OS — contrato `ensure` estándar (comprobar-primero, idempotente).
//
// Uso:  node .claude/ensure.mjs <engine> [--confirmed] [--from-source] [--force]
//
// Contrato (rules/40-check-first.md):
//   1. COMPRUEBA primero. locate() mira si el motor ya está (binario/venv presente, o sentinel con hash
//      de versión coincidente en ~/.claude/engines-build/<engine>.installed). Si está → NO-OP idempotente.
//   2. PREGUNTA antes de lo pesado. Si el motor es `heavy` y falta, se rechaza sin `--confirmed`: imprime
//      qué haría y sale con código 3. El humano decide.
//   3. IDEMPOTENCIA. Segunda pasada = no-op (sentinel + locate lo garantizan). `--force` reinstala.
//   4. Al terminar una instalación real, escribe el sentinel con el hash de versión.
//
// Los descriptores por motor viven en ENGINES. `ego` y `codebase-memory` están completos aquí (F4);
// video-production / godot-rpg / appsec-inward añaden su descriptor en F5.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir, platform } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const IS_WIN = platform() === 'win32';
const ENGINES_DIR = join(homedir(), '.claude', 'engines-build');
// Repo root = two levels up from .claude/ensure.mjs. Used by locate() for repo-relative checks.
const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
function sentinelPath(name) { return join(ENGINES_DIR, `${name}.installed`); }
function ensureDir(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }
function sha256(s) { return createHash('sha256').update(String(s)).digest('hex').slice(0, 16); }
function log(m) { process.stderr.write(`[ensure] ${m}\n`); }

function readSentinel(name) {
  const p = sentinelPath(name);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}
function writeSentinel(name, version, detail) {
  ensureDir(ENGINES_DIR);
  writeFileSync(sentinelPath(name), JSON.stringify(
    { engine: name, version, hash: sha256(`${name}@${version}`), detail: detail || '', ts: new Date().toISOString() },
    null, 2));
}

function venvPython(root) {
  const p = IS_WIN ? join(root, '.venv', 'Scripts', 'python.exe') : join(root, '.venv', 'bin', 'python');
  return existsSync(p) ? p : null;
}
function onPath(exe) {
  const dirs = (process.env.PATH || '').split(IS_WIN ? ';' : ':');
  const hit = dirs.map((d) => join(d, exe)).find(existsSync);
  return hit || null;
}
// Find the first file matching a predicate under dir, bounded to `depth` levels (default 1).
function findShallow(dir, pred, depth = 1) {
  if (!existsSync(dir)) return null;
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return null; }
  for (const e of ents) {
    const p = join(dir, e.name);
    if (e.isFile() && pred(e.name)) return p;
  }
  if (depth <= 0) return null;
  for (const e of ents) {
    if (e.isDirectory()) {
      const hit = findShallow(join(dir, e.name), pred, depth - 1);
      if (hit) return hit;
    }
  }
  return null;
}

// ─── Registro de motores ────────────────────────────────────────────────────
const ENGINES = {
  // El plugin EGO del usuario (venv con SAT/fastembed) + sus 3 MCP servers. Ya está en la máquina →
  // check-first: si el venv existe, solo registramos el sentinel; no se instala nada.
  ego: {
    heavy: false,
    version: '0.1.0',
    locate() {
      const roots = [process.env.EGO_ROOT, 'E:\\skill\\ego', join(homedir(), '.claude', 'engines-build', 'ego')].filter(Boolean);
      for (const r of roots) { const py = venvPython(r); if (py) return { ok: true, path: r, detail: `venv: ${py}` }; }
      return { ok: false, detail: `venv EGO no hallado en [${roots.join(', ')}]` };
    },
    async install() {
      // No hay build: el plugin lo provee el usuario (E:\skill\ego) o se copia ahí manualmente.
      return { ok: false, detail: 'El motor EGO lo aporta el plugin del usuario (E:\\skill\\ego con .venv). ' +
        'Clónalo/copia ahí y crea el venv (uv venv --python 3.12 .venv), o define EGO_ROOT. No es una descarga automática.' };
    },
  },

  // codebase-memory: binario estático C. Por defecto usa el release oficial prebuilt (más ligero que el
  // build); --from-source compila desde el repo. Pesado → exige --confirmed.
  'codebase-memory': {
    heavy: true,
    version: 'v0.8.1',
    locate() {
      const dir = join(ENGINES_DIR, 'codebase-memory');
      const exe = IS_WIN ? 'codebase-memory-mcp.exe' : 'codebase-memory-mcp';
      const cand = [process.env.CBM_BIN, join(dir, exe), join(dir, 'bin', exe), join(dir, 'extracted', exe), onPath(exe)].filter(Boolean);
      const hit = cand.find(existsSync);
      return hit ? { ok: true, path: hit, detail: `binario: ${hit}` } : { ok: false, detail: `binario ausente en ${dir} y PATH` };
    },
    // Dónde puede estar el CÓDIGO FUENTE de dasikuhp/codebase-memory-mcp ya clonado. No se clona solo
    // (comprobar-primero + no-red por defecto): apunta CBM_SRC, o clónalo junto a este repo / en engines-build.
    locateSource() {
      const roots = [
        process.env.CBM_SRC,
        join(dirname(REPO_ROOT), 'codebase-memory-mcp'), // convención: clonado como hermano de este repo
        join(ENGINES_DIR, 'codebase-memory-src'),
      ].filter(Boolean);
      return roots.find((r) => existsSync(join(r, 'scripts', 'build.sh'))) || null;
    },
    async install({ fromSource }) {
      const dir = join(ENGINES_DIR, 'codebase-memory');
      ensureDir(dir);
      if (!fromSource) {
        return { ok: false, detail:
          'No hay descarga de binario prebuilt automática (la fuente previa apuntaba a un org no verificado por ' +
          'el usuario — riesgo de cadena de suministro). Usa --from-source: compila dasikuhp/codebase-memory-mcp, ' +
          'la fuente que ya tienes auditada en tu propio scope.' };
      }
      const src = this.locateSource();
      if (!src) {
        return { ok: false, detail:
          `Fuente no hallada. Clona dasikuhp/codebase-memory-mcp junto a este repo (como hermano: ` +
          `${join(dirname(REPO_ROOT), 'codebase-memory-mcp')}) o define CBM_SRC apuntando a tu checkout, y reintenta.` };
      }
      // El build system es bash+Makefile (scripts/build.sh); en Windows requiere Git Bash o WSL — no hay
      // versión PowerShell nativa (no la reinventamos: usa la que ya trae Git for Windows).
      const bash = onPath(IS_WIN ? 'bash.exe' : 'bash');
      if (!bash) {
        return { ok: false, detail:
          'bash no está en PATH. El build de codebase-memory-mcp es bash+Makefile (scripts/build.sh); en Windows ' +
          'usa el bash que trae "Git for Windows" (suele quedar en PATH como bash.exe) o WSL, y reintenta.' };
      }
      log(`compilando desde ${src} (esto tarda; produce un binario grande, ~250MB)`);
      const build = spawnSync(bash, ['scripts/build.sh', '--version', this.version], { cwd: src, stdio: 'inherit' });
      if (build.status !== 0) return { ok: false, detail: 'scripts/build.sh falló (ver salida arriba). Revisa que haya un compilador C/C++ (gcc/g++ o clang) en PATH.' };
      const outDir = join(src, 'build', 'c');
      const outCandidates = [join(outDir, 'codebase-memory-mcp.exe'), join(outDir, 'codebase-memory-mcp')];
      const out = outCandidates.find(existsSync);
      if (!out) return { ok: false, detail: `build.sh terminó pero no encontré el binario en ${outDir}.` };
      const dstName = IS_WIN ? 'codebase-memory-mcp.exe' : 'codebase-memory-mcp';
      const dst = join(dir, dstName);
      // Copia manual (sin cp -p) para no depender de utilidades POSIX ausentes en PowerShell puro.
      writeFileSync(dst, readFileSync(out));
      try { chmodSync(dst, 0o755); } catch {}
      return { ok: true, detail: `compilado y copiado a ${dst}` };
    },
  },

  // video-production: se apoya en ffmpeg/ffprobe. En esta máquina ya están (winget) → check-first no-op.
  // Remotion/venv son opcionales; solo se marcan pesados si el usuario los pide explícitamente.
  'video-production': {
    heavy: false,
    version: 'ffmpeg-8',
    locate() {
      const ff = process.env.FFMPEG_BIN || onPath(IS_WIN ? 'ffmpeg.exe' : 'ffmpeg');
      return ff ? { ok: true, path: ff, detail: `ffmpeg: ${ff}` } : { ok: false, detail: 'ffmpeg no está en PATH' };
    },
    async install() {
      return { ok: false, detail: 'ffmpeg falta. Instálalo (winget install Gyan.FFmpeg) o añádelo al PATH; ' +
        'es una dependencia de sistema, no una descarga automática del SO.' };
    },
  },

  // godot-rpg: localiza cualquier Godot instalado (Desktop/godot2 o PATH). Si falta, descargarlo es pesado.
  'godot-rpg': {
    heavy: true,
    version: '4.x',
    locate() {
      // Prefer the windowed exe over the *_console.exe variant.
      const isGodot = (n) => /^godot.*\.exe$/i.test(n) && !/console/i.test(n);
      const cands = [
        process.env.GODOT_BIN,
        onPath(IS_WIN ? 'godot.exe' : 'godot'),
        findShallow(join(homedir(), 'Desktop', 'godot2'), isGodot, 3),
        findShallow('C:\\godot', isGodot, 3),
      ].filter(Boolean);
      const hit = cands.find(existsSync);
      return hit ? { ok: true, path: hit, detail: `godot: ${hit}` } : { ok: false, detail: 'Godot no hallado (Desktop/godot2, PATH, GODOT_BIN)' };
    },
    async install() {
      return { ok: false, detail: 'Godot falta. Descárgalo de godotengine.org (o define GODOT_BIN) — descarga grande, ' +
        'confírmala tú; el SO no la hace por su cuenta.' };
    },
  },

  // appsec-inward: no es un binario — está "presente" si el skill + agentes + rule inward existen en el repo.
  // Los sec.mythos_* del gateway ego-toolbelt necesitan mythos-agent (diferido); se reporta con honestidad.
  'appsec-inward': {
    heavy: false,
    version: '0.1.0',
    locate() {
      const need = [
        join(REPO_ROOT, '.claude', 'rules', '00-security-inward.md'),
        join(REPO_ROOT, '.claude', 'agents', 'appsec-red.md'),
        join(REPO_ROOT, '.claude', 'agents', 'appsec-blue.md'),
      ];
      const missing = need.filter((p) => !existsSync(p));
      if (missing.length) return { ok: false, detail: `faltan: ${missing.join(', ')}` };
      const scope = existsSync(join(REPO_ROOT, 'engagement', 'scope.json'));
      return { ok: true, detail: `red+blue inward listos${scope ? ' · scope.json presente' : ' · sin scope.json (solo local/privado)'}` };
    },
    async install() {
      return { ok: false, detail: 'appsec-inward lo componen skill+agentes+rule del repo; para sec.mythos_* construye ' +
        'mythos-agent (ego-toolbelt) aparte. No hay descarga automática.' };
    },
  },
};

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const name = args[0];
  const confirmed = args.includes('--confirmed');
  const fromSource = args.includes('--from-source');
  const force = args.includes('--force');

  if (!name || name === '--help') {
    log(`motores: ${Object.keys(ENGINES).join(', ')}`);
    log('uso: node .claude/ensure.mjs <engine> [--confirmed] [--from-source] [--force]');
    process.exit(name ? 0 : 2);
  }
  const eng = ENGINES[name];
  if (!eng) { log(`motor desconocido "${name}". Conocidos: ${Object.keys(ENGINES).join(', ')}`); process.exit(2); }

  // 1. COMPROBAR PRIMERO.
  const loc = eng.locate();
  if (loc.ok && !force) {
    if (!readSentinel(name)) writeSentinel(name, eng.version, loc.detail);
    log(`✓ ${name} ya presente — ${loc.detail}. No-op (comprobar-primero).`);
    process.exit(0);
  }
  if (force && loc.ok) { log(`--force: reinstalando ${name} pese a estar presente`); try { rmSync(sentinelPath(name)); } catch {} }

  // 2. GATE de lo pesado.
  if (eng.heavy && !confirmed) {
    log(`✋ ${name} falta y es PESADO (${loc.detail}). No instalo sin confirmación.`);
    log(`   Para proceder: node .claude/ensure.mjs ${name} --confirmed${name === 'codebase-memory' ? ' [--from-source]' : ''}`);
    process.exit(3);
  }

  // 3. INSTALAR (real) + sentinel.
  log(`instalando ${name}${confirmed ? ' (confirmado)' : ''}…`);
  const res = await eng.install({ confirmed, fromSource });
  const after = eng.locate();
  if (res.ok && after.ok) {
    writeSentinel(name, eng.version, after.detail);
    log(`✓ ${name} listo — ${after.detail}`);
    process.exit(0);
  }
  log(`✗ ${name} no quedó operativo: ${res.detail || after.detail}`);
  process.exit(1);
}

main().catch((e) => { log(`error: ${e.message}`); process.exit(1); });
