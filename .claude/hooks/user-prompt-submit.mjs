// EGO OS — UserPromptSubmit hook. Cheaply re-injects hard invariants as context when the
// prompt touches security, installation, or destructive territory, so the kernel never drifts.
import { readStdin, emit } from './lib/platform.mjs';

const payload = await readStdin();
const prompt = String(payload.prompt || payload.user_prompt || '').toLowerCase();

const TOUCHES_SECURITY = /\b(exploit|attack|pentest|scan|nmap|payload|vuln|hack|red team|redteam)\b/.test(prompt);
const TOUCHES_INSTALL = /\b(install|download|compile|build|npm i|pip install|apt|winget|clone)\b/.test(prompt);

const notes = [];
if (TOUCHES_SECURITY) {
  notes.push(
    'INVARIANTE SEGURIDAD: solo se ataca/defiende la app propia del usuario (localhost / redes privadas / ' +
    'hosts en engagement/scope.json). Cualquier objetivo externo se rechaza. Nunca fuera de scope.'
  );
}
if (TOUCHES_INSTALL) {
  notes.push(
    'INVARIANTE COMPROBAR-PRIMERO: antes de instalar/compilar/descargar, comprueba si ya está presente. ' +
    'Pregunta antes de instalar algo pesado nuevo. Toda operación idempotente.'
  );
}

if (notes.length) {
  emit({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: notes.join('\n') } });
}
emit({});
