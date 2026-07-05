// EGO OS — SessionStart hook. Boots the kernel context: active EGO facet + statusline,
// and OPTIONALLY starts the pxpipe token-saving proxy (opt-in, never on Opus).
import { readStdin, emit } from './lib/platform.mjs';
import { read } from './lib/state.mjs';
import { log } from './lib/log.mjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { claudeHome } from './lib/platform.mjs';
import { createConnection } from 'node:net';
import { spawn } from 'node:child_process';

const payload = await readStdin();
const model = String(payload.model || process.env.EGO_MODEL || '').toLowerCase();

// --- Active EGO facet + traits (statusline / boot context) ---
const facet = read('facet', { name: 'simbionte' }).name || 'simbionte';
const engines = listInstalledEngines();
const boot =
  `EGO OS activo · faceta: ${facet} · rasgos: paranoia/OCD/narcisismo-func/maquiavelismo (intensidad contextual) · ` +
  `motores: ${engines.length ? engines.join(', ') : 'ninguno instalado'}. ` +
  `Invariantes: seguridad inward-only (solo tu app), honestidad sin ocultación, firefighter caps. ` +
  `Regla debug permanente activa (tope 15 iteraciones).`;

// --- pxpipe: opt-in, gated by model ---
maybeStartPxpipe(model).then((pxNote) => {
  const context = pxNote ? `${boot}\n${pxNote}` : boot;
  emit({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } });
}).catch(() => {
  emit({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: boot } });
});

function listInstalledEngines() {
  // Sentinel names must match those written by .claude/ensure.mjs (<engine>.installed).
  const dir = join(claudeHome(), 'engines-build');
  const known = ['ego', 'codebase-memory', 'video-production', 'godot-rpg', 'appsec-inward'];
  return known.filter((k) => existsSync(join(dir, `${k}.installed`)));
}

async function maybeStartPxpipe(model) {
  const optIn = String(process.env.EGO_PXPIPE || read('settings', {}).pxpipe || '') === '1';
  if (!optIn) return '';
  if (model.includes('opus')) {
    log('pxpipe', 'skipped: Opus degrades on dense PNGs');
    return 'pxpipe omitido: se degrada en Opus (solo Fable-5/compatibles).';
  }
  const port = 47821;
  const up = await portOpen('127.0.0.1', port);
  if (up) return `pxpipe ya escuchando en :${port} (ANTHROPIC_BASE_URL=http://127.0.0.1:${port}).`;
  try {
    const child = spawn('npx', ['pxpipe-proxy'], { detached: true, stdio: 'ignore', shell: true });
    child.unref();
    log('pxpipe', 'spawned npx pxpipe-proxy');
    return `pxpipe arrancado en :${port}. Exporta ANTHROPIC_BASE_URL=http://127.0.0.1:${port} para enrutarlo.`;
  } catch (e) {
    log('pxpipe', 'spawn failed', { err: String(e) });
    return '';
  }
}

function portOpen(host, port) {
  return new Promise((resolve) => {
    const sock = createConnection({ host, port });
    const done = (v) => { try { sock.destroy(); } catch {} resolve(v); };
    sock.setTimeout(500);
    sock.on('connect', () => done(true));
    sock.on('timeout', () => done(false));
    sock.on('error', () => done(false));
  });
}
