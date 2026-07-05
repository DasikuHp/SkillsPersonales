// EGO OS — Stop hook. Closes the debug-loop: if tests went green, reset the counter and
// suggest a commit (step 5 of the debug rule). If capped without green, remind to stop.
import { readStdin, emit } from './lib/platform.mjs';
import { read, write } from './lib/state.mjs';
import { log } from './lib/log.mjs';

await readStdin();
const s = read('debug-loop', { count: 0 });

if (s.lastResult === 'pass' && (s.count || 0) > 0) {
  write('debug-loop', { count: 0, lastResult: 'pass', startedAt: null });
  log('debug-loop', 'green -> reset counter');
  emit({ systemMessage: '✅ Tests en verde: bucle de debug cerrado. Considera hacer commit (paso 5 de la regla).' });
}

if ((s.count || 0) >= 15 && s.lastResult !== 'pass') {
  emit({ systemMessage: `⚠️ Sesión terminó con ${s.count} iteraciones de debug sin verde. Reevalúa el enfoque.` });
}

emit({});
