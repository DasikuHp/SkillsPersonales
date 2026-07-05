// EGO OS — atomic JSON state store. No shell, no locks; write-tmp + rename.
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from './platform.mjs';

function pathFor(name) {
  return join(stateDir(), name.endsWith('.json') ? name : `${name}.json`);
}

export function read(name, fallback = {}) {
  const p = pathFor(name);
  if (!existsSync(p)) return { ...fallback };
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return { ...fallback }; }
}

// Atomic: write to .tmp then rename over target (safe on Windows and POSIX).
export function write(name, obj) {
  const p = pathFor(name);
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, p);
  return obj;
}

export function update(name, fn, fallback = {}) {
  const cur = read(name, fallback);
  const next = fn({ ...cur }) ?? cur;
  return write(name, next);
}
