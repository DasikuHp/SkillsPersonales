# Comprobar-primero — Filosofía y práctica en EGO OS

Sistema operativo simbiótico. Cada vez que necesita instalar, compilar, descargar o activar algo,
**comprueba primero si ya está; pregunta antes de lo pesado; todo es idempotente**.

## El contrato

**Comprueba.** Antes de actuar, verifica si el componente ya existe. En EGO OS: busca un sentinel
`.installed` en `~/.claude/engines-build/` (con hash de versión), detecta binarios presentes, o consulta
el sistema (puerto escuchando, Python importando un módulo).

**Pregunta si es pesado y falta.** Si algo implica descargar/compilar gran cantidad de código (build C,
venv 500MB, toolchain Godot), pide confirmación explícita (`--confirmed`) antes de proceder.

**Idempotencia.** Toda operación debe ejecutarse dos veces sin efectos duplicados. `install.ps1` corrido
dos veces = segunda pasada es no-op. Lo mismo para `ensure.mjs` de cada engine.

**Externos son opt-in.** No elijas por el usuario servicios de terceros sin confirmación. Ej: pxpipe OFF
por defecto, activable con `-EnablePxpipe` en install.

## Cómo se implementa en el SO

### Install.ps1 — Aditivo y reversible

```powershell
# Comprueba si ya existe
if ((Test-Path $dst) -and -not $Force -and ((Get-FileHash $src).Hash -eq (Get-FileHash $dst).Hash)) {
  Say "= $file (identico)"
  return
}
# Si no es identico y existe, hace backup ANTES de sobrescribir
if ($exists) { Backup-One $dst }
# Instala solo si cambio o no existe
if (-not $DryRun) { Copy-Item $src $dst -Force }
```

Segunda corrida: salto todos los archivos por hash idéntico. No reescribe, no borra, no rompre nada.

Hooks también respetan esto: si ya existe `PostToolUse` en settings.json, `install.ps1` emite "ya
presente" y sigue. Solo los hooks net-new (security + debug que faltan) se añaden, sin duplicar los del
plugin ego si existen.

### Ensure.mjs — Contrato check-first

Cada motor (ego, codebase-memory, video-production, godot-rpg, appsec-inward) tiene un **ensure** que
implementa:

1. **Locate (check)** — busca el binario/venv/sentinel.
2. **Sentinel hash** — si existe y el hash del archivo/versión coincide, exit 0 sin hacer nada.
3. **Falta y es pesado** — rechaza con exit 3 sin `--confirmed`.
4. **Pesado confirmado** — descarga/build/instala, escribe sentinel con hash, exit 0.

Ejemplo real (ego venv en E:\skill\ego\.venv):

```javascript
const SENTINELS = {
  'ego': '~/.claude/engines-build/ego.installed',
  'codebase-memory': '~/.claude/engines-build/codebase-memory.installed',
  'video': '~/.claude/engines-build/video-ffmpeg.installed',
  'godot': '~/.claude/engines-build/godot.installed'
};

if (existingSentinel && hashMatches(bin, sentinel)) {
  process.exit(0); // no-op, ya esta
}
if (isHeavy && !confirmed) {
  console.error('pesado; requiere --confirmed');
  process.exit(3); // rechazo reversible
}
// ...instala, escribe sentinel...
process.exit(0);
```

Segunda corrida sin cambios = exit 0 inmediato. Idempotente.

### Launchers perezosos (mcp-launchers/)

El MCP `codebase-memory` no se descarga hasta la primera llamada. El launcher `.claude/mcp-launchers/codebase-memory.mjs`:

1. Comprueba si el binario está en `~/.claude/engines-build/codebase-memory/`.
2. Si no: intenta descargar o sugiere `/ensure-engine codebase-memory --confirmed`.
3. Si sí: arranca y devuelve el puerto.

Resultado: el usuario no espera a que se descarguen 150MB en install.ps1. Sucede on-demand, con confirmación.

### Scope.json — Autorización inward explícita

El invariante "seguridad inward-only" se aplica así:

```json
{
  "targets": ["localhost", "127.0.0.1", "miapp.local"],
  "authorized_by": "usuario",
  "note": "solo mi propia app"
}
```

Sin `scope.json`, solo targets locales/privados se permiten. El usuario decide explícitamente qué es "su app".

## Realidad presente en la máquina

**Cableado (funcional ahora):**
- `install.ps1` aditivo, idempotente, reversible vía `uninstall.ps1` (usa manifest).
- `hooks/` (session-start, post-tool-use, stop) escritos en Node puro, Windows-compatible.
- `ensure.mjs` con locate check-first para ego, video, godot, appsec.
- `mcp-launchers/ego.mjs` arranca los MCP del plugin ego (E:\skill\ego\.venv).
- Sentinels en `~/.claude/engines-build/` (gitignored, no en el repo).
- Comando `/ensure-engine` manual para trigger pesado con confirmación.

**En el plugin ego (E:\skill\ego) — ya presente del usuario:**
- `.venv` con pysat, fastmcp, fastembed.
- MCP servers `ego_memory`, `ego_simbionte`, `ego_toolbelt` (Python, registrados user-scope).
- 8 skills con SKILL.md.
- `/seal/`, tests.

install.ps1 no reconstruye esto; lo usa via launcher. Si el venv falta, sugiere `/ensure-engine`.

**Motores presentes:**
- ffmpeg 8.1 (video-production detecta y gatea con sentinels).
- Godot 4.3 mono (appsec-inward valida GDScript via gdlint→godot check-only).
- node24, python3.13 (sin compilador C).

**Referencia / pendiente:**
- `codebase-memory` binario prebuilt (DeusData v0.8.1): download gateado via `/ensure-engine` con
  confirmación, launcher perezoso. El usuario decide: descarga = OK; rechaza = no se baja.
- Documento actual: `docs/CHECK-FIRST.md` (eres tú); `docs/BUILD-STATE.md` registra fase F7 (entregables
  multiplataforma en progreso).

## Ejemplos prácticos

**Caso 1: Usuario ejecuta install.ps1 dos veces.**
Primera: copia .claude/skills, .claude/agents, hooks, etc. Segunda: hash-check todas las fuentes, salto
todo. Tiempo: <100ms. Reversible: `uninstall.ps1` lee el manifest, borra exactamente lo que install anadió.

**Caso 2: Usuario quiere codebase-memory.**
`install.ps1` lo omite (pesado, externa, opt-in). Usuario dice `/ensure-engine codebase-memory
--confirmed`. Hook post-tool-use lo captura, verifica scope inward (via 00-security-inward), baja si
autorizado, escribe sentinel. Segunda llamada a `/ensure-engine`: exit 0 sin descargar.

**Caso 3: Ego venv desaparece.**
Launcher mcp-launchers/ego.mjs detecta que `E:\skill\ego\.venv` no existe. Emite error direccionado:
"ego venv no hallado en E:\skill\ego. Clona el plugin ego o ejecuta `/ensure-engine ego --confirmed`."
Usuario elige acción; install.ps1 no intenta reconstruir todo.

**Caso 4: pxpipe (opt-in externo).**
Por defecto OFF. `install.ps1 -EnablePxpipe` escribe sentinel en `~/.claude/state/settings.json`.
session-start.mjs detecta optin + modelo != Opus → usa pxpipe. Resultado: usuario decide, no sorpresas.

## Invariantes duros (nunca excepción)

Seguridad inward-only, honestidad sin ocultación, restricción (YAGNI). La filosofía comprobar-primero
refuerza la restricción: no haces de más "por si acaso". Solo lo que el usuario pide, idempotente,
reversible.
