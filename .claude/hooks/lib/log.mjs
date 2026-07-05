// EGO OS — structured logging to state/hooks.log. Never touches stdout (reserved for hook protocol).
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { stateDir } from './platform.mjs';

export function log(scope, msg, extra) {
  try {
    const line = JSON.stringify({ scope, msg, ...(extra ? { extra } : {}) });
    appendFileSync(join(stateDir(), 'hooks.log'), line + '\n', 'utf8');
  } catch { /* logging must never break a hook */ }
}
