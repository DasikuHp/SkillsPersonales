#!/usr/bin/env node
// EGO OS — check-first launcher for the Python MCP servers (ego_memory / ego_simbionte / ego_toolbelt).
//
// Resolves the ego plugin's venv Python WITHOUT compiling or installing anything. This is the
// "comprobar-primero" belt (rules/40-check-first.md): if the engine is already present we just run it;
// if the venv is missing we print a clear instruction to run /ensure-engine and exit non-zero. We NEVER
// silently install (invariant: heavy installs are opt-in and confirmed).
//
// Usage (from .mcp.json):  node .claude/mcp-launchers/ego.mjs <module>
//   module = ego_memory | ego_simbionte | ego_toolbelt
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const mod = process.argv[2];
const ALLOWED = new Set(['ego_memory', 'ego_simbionte', 'ego_toolbelt']);
if (!mod || !ALLOWED.has(mod)) {
  console.error(`[ego-os] launcher: módulo inválido "${mod}". Esperado: ${[...ALLOWED].join(' | ')}`);
  process.exit(2);
}

// Candidate ego plugin roots, in check-first order:
//   1. EGO_ROOT env override (set by install.ps1 / CLAUDE.local),
//   2. the user's existing plugin install on E:,
//   3. an engines-build copy under ~/.claude (created by ensure if the user has no E: install).
const candidates = [
  process.env.EGO_ROOT,
  'E:\\skill\\ego',
  join(homedir(), '.claude', 'engines-build', 'ego'),
].filter(Boolean);

function venvPython(root) {
  const p = process.platform === 'win32'
    ? join(root, '.venv', 'Scripts', 'python.exe')
    : join(root, '.venv', 'bin', 'python');
  return existsSync(p) ? p : null;
}

let root = null;
let py = null;
for (const c of candidates) {
  const v = venvPython(c);
  if (v) { root = c; py = v; break; }
}

if (!py) {
  console.error(
    `[ego-os] Motor EGO no encontrado: venv ausente en [${candidates.join(', ')}].\n` +
    `Ejecuta  /ensure-engine ego  para prepararlo. No se instala nada automáticamente (comprobar-primero).`,
  );
  process.exit(1);
}

// PYTHONPATH must point at the mcp/ dir so `python -m <module>` resolves the package.
const env = { ...process.env, PYTHONPATH: join(root, 'mcp') };
const child = spawn(py, ['-m', mod], { stdio: 'inherit', env });
child.on('error', (e) => { console.error(`[ego-os] no se pudo arrancar ${mod}: ${e.message}`); process.exit(1); });
child.on('exit', (code) => process.exit(code ?? 0));
