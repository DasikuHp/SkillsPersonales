#!/usr/bin/env node
// EGO OS — check-first launcher for the codebase-memory MCP server (C engine, single static binary).
//
// Resolves the codebase-memory binary WITHOUT building or downloading anything (comprobar-primero). If
// the binary is present we exec it in MCP stdio mode; if not, we print how to provision it and exit.
// Provisioning (download the official prebuilt release or build from source) is opt-in via /ensure-engine.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const isWin = process.platform === 'win32';
const exe = isWin ? 'codebase-memory-mcp.exe' : 'codebase-memory-mcp';

// Check-first order: PATH (if the user installed it globally), then the engines-build drop.
const engineDir = join(homedir(), '.claude', 'engines-build', 'codebase-memory');
const candidates = [
  process.env.CBM_BIN,
  join(engineDir, exe),
  join(engineDir, 'bin', exe),
  join(engineDir, 'extracted', exe),
].filter(Boolean);

let bin = candidates.find((p) => existsSync(p)) || null;

// Fall back to a binary already on PATH.
if (!bin) {
  const onPath = (process.env.PATH || '').split(isWin ? ';' : ':').map((d) => join(d, exe)).find(existsSync);
  if (onPath) bin = onPath;
}

if (!bin) {
  console.error(
    `[ego-os] codebase-memory no está provisto (binario ausente en ${engineDir} ni en PATH).\n` +
    `Ejecuta  /ensure-engine codebase-memory  para descargarlo/compilarlo (opt-in, comprobar-primero).`,
  );
  process.exit(1);
}

// `mcp` subcommand = run as an MCP stdio server (see codebase-memory-mcp README).
const args = process.argv.slice(2).length ? process.argv.slice(2) : ['mcp'];
const child = spawn(bin, args, { stdio: 'inherit', env: process.env });
child.on('error', (e) => { console.error(`[ego-os] no se pudo arrancar codebase-memory: ${e.message}`); process.exit(1); });
child.on('exit', (code) => process.exit(code ?? 0));
