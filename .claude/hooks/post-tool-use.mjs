// EGO OS — PostToolUse hook.
// Three jobs: (1) inward-only security gate, (2) debug-loop test counter, (3) GDScript validation flag.
import { readStdin, emit } from './lib/platform.mjs';
import { update } from './lib/state.mjs';
import { log } from './lib/log.mjs';
import { evaluate } from './lib/security.mjs';

const DEBUG_CAP = 15;
const TEST_RE = /\b(pytest|npm (run )?test|yarn test|pnpm test|vitest|jest|go test|cargo test|mvn test|gradle test|phpunit|rspec|godot .*--test|ctest|make test)\b/i;
const PASS_RE = /\b(\d+\s+passed|all tests passed|0 failed|OK\b|passing|✓|PASS\b)\b/i;
const FAIL_RE = /\b(\d+\s+failed|FAILED|error|✗|FAIL\b|assertion)\b/i;

const payload = await readStdin();
const toolName = payload.tool_name || '';
const input = payload.tool_input || {};
const result = payload.tool_response || payload.tool_result || {};
const cwd = payload.cwd || process.cwd();
const command = input.command || input.cmd || '';

// (1) SECURITY GATE — inward-only. Block external offensive targets.
const verdict = evaluate(command, cwd);
if (verdict.block) {
  log('security', 'blocked external target', { command });
  emit({
    decision: 'block',
    reason: verdict.reason,
    systemMessage: '🛡️ EGO invariante: solo se ataca/defiende tu propia app. ' + verdict.reason,
  });
}

// (2) DEBUG-LOOP COUNTER — count rounds where tests were run.
if (TEST_RE.test(command)) {
  const out = JSON.stringify(result).slice(0, 4000);
  const passed = PASS_RE.test(out) && !FAIL_RE.test(out);
  const state = update('debug-loop', (s) => {
    s.count = (s.count || 0) + 1;
    s.lastResult = passed ? 'pass' : 'fail';
    s.startedAt = s.startedAt || new Date(payload.timestamp || Date.now()).toISOString();
    return s;
  }, { count: 0 });
  log('debug-loop', `round ${state.count} -> ${state.lastResult}`);

  if (state.count >= DEBUG_CAP && state.lastResult !== 'pass') {
    emit({
      systemMessage:
        `⚠️ EGO debug-loop: ${state.count} iteraciones sin tests en verde. Regla: detente y reevalúa ` +
        `(¿el enfoque es correcto? ¿falta contexto?). No sigas iterando a ciegas.`,
    });
  }
}

// (3) GDSCRIPT VALIDATION FLAG — surface .gd edits for the godot-rpg validator.
if ((toolName === 'Edit' || toolName === 'Write') && String(input.file_path || '').endsWith('.gd')) {
  emit({
    systemMessage:
      'ℹ️ Editaste un .gd — si la skill godot-rpg está instalada, corre su validador GDScript antes de continuar.',
  });
}

emit({});
