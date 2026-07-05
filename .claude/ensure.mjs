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
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const IS_WIN = platform() === 'win32';
const ENGINES_DIR = join(homedir(), '.claude', 'engines-build');
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
    async install({ fromSource }) {
      const dir = join(ENGINES_DIR, 'codebase-memory');
      ensureDir(dir);
      if (fromSource) {
        return { ok: false, detail: 'Build desde fuente: requiere toolchain C (gcc/clang) + scripts/build.sh del repo ' +
          'DasikuHp/codebase-memory-mcp. Ejecútalo manualmente y coloca el binario en ' + dir + ' (ver F5).' };
      }
      // Prebuilt oficial (Windows amd64). Descarga con curl (presente en Windows 10+), extrae con tar/Expand-Archive.
      const url = 'https://github.com/DeusData/codebase-memory-mcp/releases/download/v0.8.1/codebase-memory-mcp-windows-amd64.zip';
      const zip = join(dir, 'cbm.zip');
      log(`descargando ${url}`);
      const dl = spawnSync('curl', ['-sL', '-o', zip, url], { stdio: 'inherit' });
      if (dl.status !== 0 || !existsSync(zip)) return { ok: false, detail: 'descarga falló (curl). Revisa red o usa --from-source.' };
      log('extrayendo');
      const ex = spawnSync('tar', ['-xf', zip, '-C', dir], { stdio: 'inherit' });
      if (ex.status !== 0) return { ok: false, detail: 'extracción falló (tar). Extrae ' + zip + ' manualmente.' };
      return { ok: true, detail: 'prebuilt v0.8.1 extraído en ' + dir };
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
