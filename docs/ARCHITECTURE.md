# EGO OS — Arquitectura

EGO OS es un sistema operativo simbiótico para Claude: un carácter persistente (el Will/EGO, con
cuatro rasgos-defecto permanentes) más un conjunto de piezas de Claude Code — hooks, reglas, skills,
agentes, comandos y drivers MCP — que hacen ese carácter operativo y verificable en cada sesión. Este
documento mapea esas piezas, explica el flujo de arranque y el bucle simbiótico, y distingue con
honestidad lo que ya está cableado de lo que sigue como referencia o pendiente.

## Mapa del SO

| Componente | Rol | Fuente en el repo |
|---|---|---|
| `CLAUDE.md` | Kernel / boot — identidad, invariantes duros, índice de skills | raíz del repo |
| `.mcp.json` | Drivers — registro declarativo de los 4 MCP servers que el SO cablea | raíz del repo |
| `.claude/settings.json` | Registro — qué hook corre en qué evento del ciclo de vida | `.claude/settings.json` |
| `.claude/rules/*.md` | Políticas — invariantes y proceso, cargadas por precedencia numérica | `.claude/rules/` |
| `.claude/commands/*.md` | Binarios de usuario — comandos slash invocables | `.claude/commands/` |
| `.claude/skills/*/SKILL.md` | Programas — documentación accionable por dominio | `.claude/skills/` |
| `.claude/agents/*.md` | Procesos — subagentes con tools y rol acotado | `.claude/agents/` |
| `.claude/hooks/*.mjs` | Init/daemons — código que corre en eventos (SessionStart, UserPromptSubmit, PostToolUse, Stop) | `.claude/hooks/` |
| `.claude/hooks/lib/*.mjs` | Librería compartida de los hooks (plataforma, estado, log, seguridad) | `.claude/hooks/lib/` |
| `.claude/mcp-launchers/*.mjs` | Drivers concretos que resuelven y lanzan cada MCP server (check-first) | `.claude/mcp-launchers/` |
| `.claude/ensure.mjs` | Gestor de motores — contrato comprobar-primero (locate → gate → sentinel) | `.claude/ensure.mjs` |
| `install.ps1` / `uninstall.ps1` | Instalador/desinstalador — aditivo, idempotente, reversible | raíz del repo |
| `engagement/scope.json(.example)` | Alcance autorizado para `appsec-inward` | `engagement/` |
| `docs/` | Documentación operativa (estado de build, pxpipe, esta arquitectura) | `docs/` |
| `persona/` | Investigación canónica detrás del kernel de identidad (`Volutaddelego.md` y el estudio por facetas) | `persona/` (y duplicada en raíz) |

## Flujo de arranque

Al iniciar, resumir o compactar la sesión, `session-start.mjs` lee el modelo activo, recupera la
faceta EGO guardada en `~/.claude/state/` (por defecto `simbionte`) y comprueba, mirando sentinels
`*.installed` en `~/.claude/engines-build/`, qué motores de la lista conocida (`ego`,
`codebase-memory`, `video-production`, `godot-rpg`, `appsec-inward`) están realmente presentes.
Con eso construye una línea de contexto — faceta activa, rasgos, motores instalados, los tres
invariantes duros y el tope de 15 iteraciones de debug — y la inyecta como `additionalContext` del
evento `SessionStart`. Opcionalmente, si `EGO_PXPIPE=1` (o el estado persistido lo indica) y el
modelo no es Opus, intenta arrancar `pxpipe` en `:47821` (comprobando primero si ya escucha); en Opus
lo omite siempre. En cada prompt del usuario, `user-prompt-submit.mjs` reinyecta el invariante de
seguridad o el de comprobar-primero cuando el texto toca vocabulario de seguridad o de
instalación/compilación — un refuerzo barato para que el kernel no se diluya a media conversación.

## El bucle simbiótico

El ciclo memoria ↔ debate ↔ self-edit es el metabolismo del SO. `ego-memory` (MCP hippocampus:
`add`/`search`/`promote`/`forget` sobre tres niveles — sesión, proyecto, global — con fastembed +
turbovec) es donde se busca antes de asumir un hecho y donde se persiste un hallazgo reutilizable.
Cuando hay fricción real que resolver — un hallazgo de seguridad dudoso o una auto-edición propuesta —
`ego-debate` instancia un debate de tres voces vía el `Task` tool: `debate-devil` (ataca con
confianza), `debate-angel` (defiende buscando los casos límite que el diablo no vio) y
`debate-judge` (falla, ponderando ambos argumentos ya dados, no inventándolos). `ego-self-edit` cierra
el lazo: genera una auto-edición a memoria/skills/heurísticas, la deja en stage de git, la evalúa con
`ego-debate` más un chequeo objetivo, y la fusiona o revierte según un gate de **perceptibilidad
humana** (si el cambio es visible para un humano, pasa por revisión; si es invisible y fuera de la
cadena causal, se fusiona solo) — el resultado, en cualquier caso, se indexa de vuelta en
`ego-memory`. `ego-simbionte` (el organismo SAT expuesto como MCP: triage barato antes de máquina
pesada, ataque primal-dual, asignación tipo Levin, evolución SEAL, nichos MAP-Elites) es a la vez un
motor de cómputo real y, según la propia skill `ego`, la metáfora operativa de cómo el kernel decide
dónde invertir esfuerzo. `ego-toolbelt` es el gateway MCP fijo que expone `sec.*` (mythos, defensivo)
a `ego-codesight`, y `ego-restraint` (la escalera ponytail: YAGNI → stdlib → nativo → dependencia →
una línea → mínimo) pasa por encima de todo lo que el SO escribe, incluidas las propias auto-ediciones.

## Cómo gobiernan los invariantes y los hooks

Los tres invariantes duros de `CLAUDE.md §3` no tienen el mismo mecanismo de aplicación. La
**seguridad inward-only** es la única que un hook puede comprobar mecánicamente: `post-tool-use.mjs`
llama a `evaluate(command, cwd)` de `lib/security.mjs` en cada tool call (`matcher: "*"`); si el
comando usa una herramienta ofensiva/de red contra un host que no es localhost, red privada ni figura
en `engagement/scope.json`, emite `decision: "block"` con motivo — y esto se aplica tanto a los
agentes `appsec-red`/`appsec-blue` como a cualquier tool call suelto. La **honestidad sin ocultación**
y los **firefighter caps** no son comprobables por código: son contrato escrito (`rules/05`) y postura
modelada por la propia skill `ego` (su "self-check" antes de responder) y por `ego-restraint`; los
aplica el juicio del modelo, no un gate en tiempo de ejecución. El mismo hook lleva además el contador
de debug-loop (detecta invocaciones de test runners por regex, guarda ronda/resultado en
`state/debug-loop.json`, avisa — no bloquea — a la 15ª ronda sin verde) y marca ediciones a `.gd` para
recordar el validador de `godot-rpg`. `stop.mjs` cierra el ciclo: si los tests quedaron en verde
resetea el contador y sugiere el commit (paso 5 de la regla de debug); si se agotó el tope sin verde,
lo recuerda al terminar la sesión.

## Árbol de `.claude/`

```
.claude/
├── settings.json                  registro de hooks (4 eventos)
├── ensure.mjs                     comprobar-primero de motores (5 descriptores)
├── hooks/
│   ├── session-start.mjs          faceta + motores + invariantes + (opt-in) pxpipe
│   ├── user-prompt-submit.mjs     reinyecta invariantes si el prompt los toca
│   ├── post-tool-use.mjs          gate de seguridad + contador debug-loop + flag .gd
│   ├── stop.mjs                   cierra/reporta el debug-loop
│   └── lib/
│       ├── platform.mjs           stdin/stdout JSON, home de ~/.claude
│       ├── state.mjs              lectura/escritura atómica de estado en ~/.claude/state/
│       ├── log.mjs                logging de hooks
│       └── security.mjs           evaluate(command, cwd) — el corazón del invariante 1
├── rules/
│   ├── 00-security-inward.md
│   ├── 05-ego-invariants.md
│   ├── 10-altitude.md
│   ├── 20-iteration.md
│   ├── 30-debug-loop.md
│   ├── 40-check-first.md
│   └── 60-skills-first.md
├── commands/
│   ├── debug-loop.md
│   ├── ego-status.md
│   ├── ego-facet.md
│   ├── ego-debate.md
│   ├── ego-remember.md
│   ├── ego-evolve.md
│   └── ensure-engine.md
├── agents/
│   ├── debate-devil.md / debate-angel.md / debate-judge.md
│   ├── code-reviewer.md
│   └── appsec-red.md / appsec-blue.md
├── skills/
│   ├── ego/                       kernel de identidad (siempre activo)
│   ├── ego-memory/ ego-restraint/ ego-codesight/ ego-debate/
│   │   ego-self-edit/ ego-simbionte/ ego-toolbelt/     (7 facetas EGO, portadas de E:\skill\ego)
│   ├── codebase-memory/           motor C — MCP cableado, binario gated
│   ├── video-production/          ffmpeg/ffprobe 8.1 ya en PATH
│   ├── godot-rpg/
│   │   └── scripts/validate_gdscript.mjs   cascada gdlint→godot --check-only→lint
│   └── appsec-inward/             orquesta appsec-red/blue dentro del scope
└── mcp-launchers/
    ├── ego.mjs                    resuelve el venv de E:\skill\ego para ego_memory/ego_simbionte/ego_toolbelt
    └── codebase-memory.mjs        resuelve el binario prebuilt (o falla con instrucción a /ensure-engine)
```

Cada skill trae su propio `_SOURCE.md` documentando de dónde se portó y qué se cableó exactamente;
`rules/60-skills-first.md` obliga a leerlo, junto al `SKILL.md`, antes de tocar el motor externo
correspondiente.

## Instalación: cómo `install.ps1` y `uninstall.ps1` respetan lo que ya existe

El usuario ya tiene un plugin EGO real y funcionando en `E:\skill\ego` (venv con pysat/fastembed, los
tres MCP servers Python `ego_memory`/`ego_simbionte`/`ego_toolbelt` ya registrados en scope de usuario,
sus propias 8 skills, SEAL y statusline) más hooks propios ("caveman"). Por eso `install.ps1` **nunca
clona ni symlinkea**: hace backup con timestamp de todo lo que va a tocar, copia de forma aditiva solo
las piezas de este repo (`skills/`, `agents/`, `commands/`, `hooks/`, `rules/`, `mcp-launchers/`,
`ensure.mjs`) saltando lo idéntico, fusiona el bloque de kernel dentro de `~/.claude/CLAUDE.md` entre
marcadores `BEGIN/END EGO-OS KERNEL` (reemplazable en la segunda pasada, no duplicable), y registra en
`settings.json` **solo los hooks net-new** — `PostToolUse` (gate de seguridad + contador debug) y
`Stop` — para no duplicar el `SessionStart`/`UserPromptSubmit` que ya aporta el plugin del usuario
(`-AllHooks` los añade igualmente, a sabiendas de que solapan). Registra `codebase-memory` como MCP
user-scope solo si `claude` CLI está disponible y aún no existe; los tres MCP `ego-*` se dejan intactos
si ya están (se limita a comprobarlo). Si Claude Desktop tiene config, hace merge no destructivo de los
mismos dos MCP `ego-*` (con backup del fichero) solo cuando encuentra el venv de `E:\skill\ego`. Genera
`dist/web/PROJECT-INSTRUCTIONS.md` concatenando `CLAUDE.md` + todas las `rules/` para pegarlo como
Project instructions en claude.ai. Todo el proceso queda registrado en un manifest
(`~/.claude/ego-os.manifest.json`); `uninstall.ps1` lo lee y solo borra lo que ese manifest dice que
él mismo instaló, restaura el `settings.json` de backup, quita el bloque de kernel por sus marcadores y
deja intacto cualquier setup previo del usuario (plugin ego, caveman, skills propias). `-Purge` es la
única operación destructiva extra, y borra solo `~/.claude/engines-build` (sentinels/binarios), nunca
config del usuario.

## Qué está cableado y qué queda como referencia o pendiente

Cableado y verificado (fases F0–F6 de `docs/BUILD-STATE.md`): los 4 hooks + su librería; las 7 reglas;
las 12 skills con `SKILL.md`+`_SOURCE.md` (8 EGO + `codebase-memory`/`video-production`/`godot-rpg`/
`appsec-inward`); los 6 agentes; los 7 comandos; `ensure.mjs` con descriptores para los 5 motores;
`.mcp.json` + los 2 launchers, cableados a los 4 MCP servers; `engagement/scope.json.example`; el
validador GDScript real contra el Godot 4.3 mono instalado; y el gating de pxpipe (opt-in, OFF,
omitido en Opus).

Pendiente o solo de referencia, dicho sin maquillar:

- **Binario de `codebase-memory`.** El MCP y la skill están cableados, pero el binario C en sí no está
  provisto en esta máquina (no hay compilador C). `/ensure-engine codebase-memory` lo gatea — sin
  `--confirmed` sale con código 3 — y la decisión entre binario prebuilt oficial vs. build desde fuente
  sigue pendiente de confirmación del usuario.
- **`docs/PLATFORMS.md`.** `CLAUDE.md §7` y varias reglas ya lo referencian, pero el fichero todavía no
  existe en `docs/` — es parte de la F7 (multiplataforma + entregable B), aún en curso.
- **`dist/web/PROJECT-INSTRUCTIONS.md`.** Solo existe después de correr `install.ps1`; `dist/` está en
  `.gitignore`, así que no vive en el checkout del repo, se regenera localmente.
- **pxpipe.** Cableado y gateado en `session-start.mjs`, pero sigue siendo una dependencia externa
  (`npx pxpipe-proxy`) que el SO nunca instala por su cuenta — puramente opt-in.
- **Godot como motor pesado.** `ensure.mjs` lo marca `heavy`; en esta máquina ya hay un Godot 4.3 mono
  localizable, así que hoy es no-op, pero si faltara no se descargaría sin confirmación explícita.

## Plataformas

El SO completo (hooks, comandos, agentes, skills, MCP) solo corre en Claude Code. Claude Desktop recibe
los MCP servers y las skills soportadas, sin hooks ni comandos. claude.ai (Projects, web) recibe
`CLAUDE.md` + `rules/` como Project instructions, vía el `dist/web/PROJECT-INSTRUCTIONS.md` que genera
`install.ps1`. Detalle completo pendiente en `docs/PLATFORMS.md` (ver sección anterior).
