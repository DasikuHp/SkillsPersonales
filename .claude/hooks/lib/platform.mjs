// EGO OS — platform helpers. Windows-first, cross-platform. Zero deps.
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

export const IS_WIN = platform() === 'win32';

// Root of the installed OS: ~/.claude (or %USERPROFILE%\.claude on Windows).
export function claudeHome() {
  return join(homedir(), '.claude');
}

// Runtime state dir; created on demand. Never versioned.
export function stateDir() {
  const dir = join(claudeHome(), 'state');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

// Where compiled/heavy engines land after `ensure`. Never versioned.
export function enginesDir() {
  const dir = join(claudeHome(), 'engines-build');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

// Read a hook's stdin JSON payload. Returns {} on empty/invalid so hooks never crash.
export async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    const to = setTimeout(() => resolve(safeParse(data)), 2000);
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => { clearTimeout(to); resolve(safeParse(data)); });
    process.stdin.on('error', () => { clearTimeout(to); resolve({}); });
  });
}

function safeParse(s) {
  if (!s || !s.trim()) return {};
  try { return JSON.parse(s); } catch { return {}; }
}

// Emit a hook result as JSON on stdout and exit 0. Claude Code reads this.
export function emit(obj = {}) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}
