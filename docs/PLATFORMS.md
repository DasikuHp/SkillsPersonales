# EGO OS — Plataformas

EGO OS es, en su forma completa, un conjunto de hooks + comandos + agentes + skills + servidores MCP que
solo tiene sentido dentro del bucle de herramientas de Claude Code: necesita un tool-loop con `Bash` para
correr motores (ffmpeg, Godot, validadores), un `settings.json` que dispare hooks, y un filesystem de
proyecto donde vivan `.claude/skills`, `.claude/agents` y `.claude/commands`. Ni Claude Desktop ni claude.ai
(Web) ofrecen esa superficie, así que ambas reciben **proyecciones parciales**, no el sistema operativo. Esta
página documenta con precisión qué corre en cada plataforma, cómo se genera cada proyección y qué se pierde
al proyectar — sin maquillar lo que todavía es referencia o está pendiente (invariante 2, honestidad sin
ocultación).

## Matriz

| Componente | Claude Code | Claude Desktop | Web (claude.ai, Project instructions) |
|---|---|---|---|
| `CLAUDE.md` (kernel) | Sí — bloque gestionado en `~/.claude/CLAUDE.md`, entre marcadores `BEGIN/END EGO-OS KERNEL` | No — Desktop no lee `CLAUDE.md` de proyecto | Sí — texto completo pegado en `dist/web/PROJECT-INSTRUCTIONS.md` |
| `.claude/rules/*.md` (00→60) | Sí — cargadas por precedencia numérica | No | Sí — concatenadas al mismo bundle, una sección `## rule: NN-nombre.md` por fichero |
| Hooks (session-start, user-prompt-submit, post-tool-use, stop) | Parcial por defecto — `install.ps1` solo añade `PostToolUse` (security gate + contador debug) y `Stop`; `SessionStart`/`UserPromptSubmit` requieren `-AllHooks` (se omiten por defecto para no duplicar los del plugin ego real ya instalado) | No — Desktop no tiene mecanismo de hooks | No — no hay hooks en un system prompt de texto |
| Skills (8 EGO + 4 motor) | Sí, las 12 | Parcial y no cableado por este instalador — `install.ps1` copia el árbol a `~/.claude/skills` (ruta compartida); las skills que son solo instrucción (p.ej. `ego-restraint`, `ego-debate`) podrían funcionar si esa versión de Desktop soporta Skills, pero las que dependen de `Bash` para invocar un motor (ffmpeg, Godot, gdlint, build de codebase-memory) no funcionan igual sin tool-loop de shell | No — un Project de claude.ai no ejecuta skills ni tools locales |
| Agentes (debate-devil/angel/judge, code-reviewer, appsec-red/blue) | Sí, como subagentes reales | No | No |
| Comandos (`/debug-loop`, `/ego-*`, `/ensure-engine`) | Sí | No — Desktop no tiene slash-commands de proyecto | No |
| MCP: `ego-memory`, `ego-simbionte` | Sí, vía `.mcp.json` + `mcp-launchers/ego.mjs` | Sí — `install.ps1` los mergea en `claude_desktop_config.json`, **solo si** detecta `E:\skill\ego\.venv\Scripts\python.exe` | No — claude.ai no habla MCP por stdio local |
| MCP: `ego-toolbelt` | Sí, vía `.mcp.json` | No — el merge a Desktop de `install.ps1` solo cubre `ego-memory`/`ego-simbionte`, no `ego-toolbelt` | No |
| MCP: `codebase-memory` | Sí, cableado (launcher + `.mcp.json`); el binario prebuilt real está gated por `/ensure-engine`, **aún no provisto** | No — `install.ps1` lo registra con `claude mcp add -s user` (CLI de Code), no lo mergea al config de Desktop | No |
| Motores externos (ffmpeg 8.1, Godot 4.3 mono, node24, python3.13; sin compilador C) | Sí, invocados vía `Bash` desde las skills de motor | No — no hay `Bash` en Desktop | No |
| `ensure.mjs` / comprobar-primero | Sí | No aplica | No aplica |
| pxpipe (opt-in, OFF, nunca Opus) | Sí, gateado en `session-start.mjs`; solo activo si ese hook está instalado (ver fila de hooks) | No aplica | No aplica |

## Cómo se exporta cada una

**Code** no se "exporta": es la fuente. `install.ps1` copia de forma aditiva `.claude/{skills,agents,commands,
hooks,rules,mcp-launchers}` y `ensure.mjs` a `~/.claude/`, saltando ficheros idénticos e idempotente en
reejecuciones; hace backup con timestamp de cualquier fichero que vaya a sobrescribir. El kernel se inserta
como bloque gestionado dentro de `~/.claude/CLAUDE.md` (reemplazable en cada instalación sin tocar el resto
del archivo del usuario). Los hooks se añaden a `~/.claude/settings.json` por nombre de comando, comprobando
antes si ya existen para no duplicar.

**Desktop** se actualiza mergeando `claude_desktop_config.json` (bajo `%APPDATA%\Claude\`): `install.ps1` hace
backup (`.ego-bak-<timestamp>`) y añade las entradas `ego-memory`/`ego-simbionte` a `mcpServers` solo si
faltan y solo si el venv del plugin ego real (`E:\skill\ego\.venv`) existe — si no lo encuentra, no toca la
configuración de Desktop en absoluto. `-NoDesktop` desactiva este paso.

**Web** se genera siempre (salvo `-DryRun`) como `dist/web/PROJECT-INSTRUCTIONS.md`: concatena el `CLAUDE.md`
completo del repo con cada regla de `.claude/rules/*.md` (ordenadas por nombre, cada una bajo su propio
encabezado `## rule: NN-nombre.md`). Es un artefacto de build que se sobrescribe entero en cada ejecución
(no hace backup ni merge — no representa estado del usuario). Llevarlo a la práctica es manual: el usuario
copia ese fichero al campo "Project instructions" de un Project en claude.ai.

## Qué se pierde en cada proyección

En **Desktop** se pierde toda aplicación mecánica: no hay hook que bloquee un comando contra un host externo,
ni contador de iteraciones de debug, ni inyección automática de faceta/estado de motores al arrancar sesión.
Los invariantes duros (seguridad inward-only, honestidad, restricción) dejan de tener un gate de código detrás
y pasan a depender de que el modelo los siga por criterio, exactamente igual que cualquier instrucción de
sistema. Se pierden también los agentes con nombre (debate-devil/angel/judge, appsec-red/blue) y los comandos
`/ego-*`: en Desktop no hay equivalente de subagente ni slash-command de proyecto. Las skills de motor
(`video-production`, `godot-rpg`, `codebase-memory`, `appsec-inward`) pierden su razón de ser porque no hay
`Bash` para invocar ffmpeg/Godot/gdlint ni para levantar el build; en el mejor caso sirven como documentación
de referencia leída por el modelo, no como automatización real.

En **Web** se pierde todo lo anterior más los propios servidores MCP: sin stdio local no hay `ego-memory`,
`ego-simbionte`, `ego-toolbelt` ni `codebase-memory`, así que memoria persistente entre sesiones, orquestación
de facetas (SAT) y consulta de codebase indexado quedan fuera. Lo único que sobrevive es texto: el carácter
(4 rasgos + árbitro Self), los invariantes duros como prosa, y los patrones de proceso (altitud, iteración,
skills-first, debug-loop) como guía de estilo que el modelo intenta seguir sin ningún mecanismo que lo fuerce
ni lo mida.

## Cableado vs. pendiente (honestidad explícita)

- El motor de `codebase-memory` está cableado en `.mcp.json` y `mcp-launchers/codebase-memory.mjs`, pero el
  binario prebuilt real que necesita sigue gated por `/ensure-engine`, que **aún no está provisto** — hoy es
  referencia, no una ruta funcional de punta a punta.
- Los hooks `SessionStart` y `UserPromptSubmit` (inyección de faceta activa, estado de motores, gate de
  pxpipe) **no se instalan por defecto** en Code; requieren `install.ps1 -AllHooks`. La razón documentada en
  el propio instalador es evitar duplicar lo que ya hace el plugin ego real del usuario (`E:\skill\ego`,
  hooks caveman). Sin `-AllHooks`, pxpipe no se activa nunca porque su gate vive en `session-start.mjs`.
- El merge a Desktop cubre únicamente `ego-memory` y `ego-simbionte`; `ego-toolbelt` y `codebase-memory` no se
  añaden al `claude_desktop_config.json` por esta instalación, aunque sí existan como servidores MCP para
  Code.
- `uninstall.ps1` revierte lo que instaló en `~/.claude` (ficheros, bloque de kernel, `settings.json` desde
  backup) y el registro `codebase-memory` de la CLI de Code, pero **no** restaura automáticamente
  `claude_desktop_config.json` (el backup `.ego-bak-<timestamp>` queda ahí para restaurar a mano) ni borra
  `dist/web/PROJECT-INSTRUCTIONS.md`. Deshacer la proyección Web significa además quitar a mano el texto
  pegado en el Project de claude.ai — eso no lo puede alcanzar ningún script local.
