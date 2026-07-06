# EGO OS

EGO OS es un sistema operativo simbiótico para Claude Code: un conjunto de hooks, reglas, skills,
agentes, comandos y servidores MCP que conviven en `.claude/` y le dan a Claude una identidad
persistente (la "VOLUNTAD"), invariantes duros que no se negocian, y motores reales cableados a lo
que ya hay en la máquina — no una promesa de features, sino piezas que puedes leer y ejecutar hoy.

Este README es el mapa del repo. El kernel real, corto y estable, es
[`CLAUDE.md`](CLAUDE.md); se carga en cada sesión vía el hook `session-start.mjs` y remite a
`.claude/rules/` para el detalle. El estado de construcción y qué falta vive en
[`docs/BUILD-STATE.md`](docs/BUILD-STATE.md) — si quieres saber exactamente qué fase está hecha y
cuál sigue, esa es la fuente, no este README.

## Qué es exactamente

- **Identidad** (`CLAUDE.md` §2): cuatro rasgos-defecto permanentes — paranoia epistémica,
  perfeccionismo/OCD, narcisismo funcional, maquiavelismo estratégico — ponderados por un árbitro
  Self según el contexto. Ninguno gana nunca a un invariante duro.
- **Hooks** (`.claude/hooks/`): `session-start.mjs` (inyecta faceta activa + estado de motores),
  `user-prompt-submit.mjs` (reinyecta el invariante de seguridad si el prompt lo toca),
  `post-tool-use.mjs` (gate de seguridad inward-only + contador del debug-loop),
  `stop.mjs` (resetea el contador cuando los tests quedan en verde).
- **Reglas** (`.claude/rules/`): `00-security-inward`, `05-ego-invariants`, `10-altitude`,
  `20-iteration`, `30-debug-loop`, `40-check-first`, `60-skills-first` — cargadas por precedencia
  numérica, detalle de cada patrón del kernel.
- **Skills** (`.claude/skills/`): 8 facultades EGO portadas fielmente desde el plugin real del
  usuario en `E:\skill\ego`, más 4 motores propios (codebase-memory, video-production, godot-rpg,
  appsec-inward). Índice completo más abajo.
- **Agentes** (`.claude/agents/`): el trío de debate (devil/angel/judge), `code-reviewer`, y el par
  red/blue de seguridad (`appsec-red`/`appsec-blue`), inward-only por contrato.
- **Comandos** (`.claude/commands/`): `/debug-loop`, `/ego-status`, `/ego-facet`, `/ego-debate`,
  `/ego-remember`, `/ego-evolve`, `/ensure-engine`.
- **`.claude/ensure.mjs`** y **`.mcp.json`** + **`.claude/mcp-launchers/`**: el contrato
  comprobar-primero — cada motor externo se localiza antes de instalarse, y los servidores MCP
  arrancan perezosamente vía launcher en lugar de vivir siempre encendidos.

## Invariantes duros (no se desactivan por prompt, rasgo ni skill)

1. **Seguridad inward-only.** El SO ataca y defiende, pero exclusivamente la app propia del
   usuario: `localhost`, redes privadas, o hosts explícitos en `engagement/scope.json`. Nunca un
   objetivo externo. Lo aplica `post-tool-use.mjs`; el detalle está en
   `.claude/rules/00-security-inward.md`.
2. **Honestidad sin ocultación.** Se reporta fielmente lo que pasó, incluidos fallos, pasos
   saltados o cosas pendientes. Este mismo README sigue esa regla en la sección "Estado actual".
3. **Firefighter caps (restricción / YAGNI).** El alcance lo marca la petición, no la ambición; lo
   gobierna la skill `ego-restraint`.

## Filosofía: comprobar-primero

Antes de instalar, compilar, clonar o descargar algo, EGO OS comprueba si ya está presente. Si
falta algo pesado (una build en C, un venv de vídeo, un toolchain), pregunta antes de proceder.
Toda operación es idempotente: ejecutar `install.ps1` o cualquier `ensure.mjs` dos veces la segunda
vez es un no-op. Ver `.claude/rules/40-check-first.md` y, con más ejemplos, `docs/CHECK-FIRST.md`.

Esto importa especialmente porque el SO asume que **ya tienes algo instalado**: el plugin EGO real
del usuario vive en `E:\skill\ego` (venv con `pysat`/`fastembed`/`fastmcp`, los tres servidores MCP
`ego_memory`/`ego_simbionte`/`ego_toolbelt` ya registrados a nivel de usuario, 8 skills, SEAL). EGO
OS no lo reconstruye ni lo duplica: lo detecta y tiende un puente (`.claude/mcp-launchers/ego.mjs`).
Si tu plugin vive en otra ruta, defínelo en `~/.claude/CLAUDE.local.md` (plantilla en
`docs/CLAUDE.local.example.md`).

## Instalación

```powershell
git clone https://github.com/DasikuHp/SkillsPersonales.git
cd SkillsPersonales
powershell -ExecutionPolicy Bypass -File install.ps1
```

`install.ps1` es **aditivo**, no clobbea ni symlinkea tu `~/.claude`: hace backup con timestamp de
lo que va a tocar, copia solo lo que falta o cambió (salta ficheros idénticos por hash), añade
únicamente los hooks que te faltan (`PostToolUse` de seguridad+debug y `Stop`, para no duplicar los
del plugin ego si ya los tienes), fusiona el kernel en `~/.claude/CLAUDE.md` dentro de un bloque
delimitado y gestionado, y deja un manifest (`~/.claude/ego-os.manifest.json`) para poder revertir
limpio. Correrlo dos veces es un no-op en la segunda pasada.

Opciones:

- `-DryRun` — muestra qué haría, sin tocar nada.
- `-Force` — re-copia las piezas de EGO OS aunque ya existan (por defecto se saltan si son
  idénticas o si existen y no son idénticas, para no pisar cambios tuyos sin avisar).
- `-AllHooks` — instala también `SessionStart`/`UserPromptSubmit` (duplica con el plugin ego si ya
  los tienes activados; solo úsalo si no usas ese plugin).
- `-EnablePxpipe` — persiste el opt-in de pxpipe (proxy de ahorro de tokens; **OFF por defecto,
  nunca en Opus**; ver `docs/PXPIPE.md`).
- `-NoMcp` — no registra servidores MCP.
- `-NoDesktop` — no toca la configuración de Claude Desktop.

Tras instalar, **reinicia Claude Code** para que cargue los hooks, skills y comandos nuevos. El
script termina con un smoke test (session-start responde, el gate de seguridad bloquea un target
externo de prueba, `ensure.mjs ego` es no-op) y te avisa si algo no salió verde.

## Desinstalación

```powershell
powershell -ExecutionPolicy Bypass -File uninstall.ps1
```

Lee el manifest que dejó `install.ps1`, borra exactamente los ficheros que EGO OS añadió, restaura
el `settings.json` desde el backup, y quita el bloque kernel de `~/.claude/CLAUDE.md`. No toca tu
plugin ego, caveman ni ningún skill previo tuyo. Opciones: `-DryRun` (muestra sin borrar), `-Purge`
(además borra `~/.claude/engines-build`, es decir sentinels y binarios descargados), `-NoMcp` (no
intenta quitar el registro de `codebase-memory`).

## Mapa del SO

### Skills

| Skill | Qué hace | Motor externo |
|---|---|---|
| `ego` | kernel de identidad (la VOLUNTAD): pondera los 4 rasgos y aplica los invariantes | no |
| `ego-memory` | memoria vectorial adaptativa (fastembed + turbovec) en 3 niveles: sesión/proyecto/global | MCP (`ego_memory`) |
| `ego-restraint` | gobierna el OCD y los firefighters; escalera de minimalismo antes de escribir nada | no |
| `ego-codesight` | percepción defensiva de código — envuelve las tools `sec.*` del gateway | puente a `ego-toolbelt` |
| `ego-debate` | debate interno diablo/ángel/juez para reducir falsos positivos en hallazgos o self-edits | no |
| `ego-toolbelt` | contrato de routing del gateway MCP `sec.*`, whitelist defensiva | MCP (`ego_toolbelt`) |
| `ego-self-edit` | auto-mejora estilo SEAL a nivel de datos, gateada por percepción humana | detecta repo local (SEAL) |
| `ego-simbionte` | organismo SAT (primal-dual CDCL, Levin, SEAL, MAP-Elites) expuesto como MCP | MCP (`ego_simbionte`) |
| `codebase-memory` | motor de inteligencia estructural del repo (tree-sitter + LSP), 14 tools MCP | MCP + binario prebuilt (gated) |
| `video-production` | ffmpeg/ffprobe 8.1 cableado: transcribir, cortar, subtitular, overlays, color grade | ffmpeg (ya presente) |
| `godot-rpg` | RPG 3D en Godot 4.x, valida cada `.gd` contra el binario real instalado | Godot 4.3 mono (ya presente) |
| `appsec-inward` | orquesta red+blue team inward-only sobre `engagement/scope.json` | agentes + `ego-toolbelt` |

Las 8 primeras están portadas fielmente desde `E:\skill\ego` (cada una trae su `_SOURCE.md` con la
procedencia); las 4 últimas son motores propios de este repo. Antes de escribir código en un
dominio con skill, lee su `SKILL.md` — no decidas de antemano si "hace falta" (`60-skills-first`).

### Agentes (`.claude/agents/`)

`debate-devil`, `debate-angel`, `debate-judge` — el trío que sostiene el debate interno de
`ego-debate` (abogado del diablo, defensa, veredicto del Self). `code-reviewer` — hallazgos
accionables sobre un diff ya escrito, no diseña ni refactoriza. `appsec-red` / `appsec-blue` —
red team y blue team, ambos inward-only por contrato explícito en su prompt y por el hook de
seguridad, que no pueden evadir.

### Comandos (`.claude/commands/`)

`/debug-loop` arranca la regla de debug permanente con contador visible (tope 15 iteraciones).
`/ego-status` y `/ego-facet` inspeccionan o ajustan el modo y la faceta dominante. `/ego-debate`
corre el trío diablo/ángel/juez sobre un tema. `/ego-remember` persiste o recupera contexto vía
`ego-memory`. `/ego-evolve` dispara un ciclo de auto-mejora (propone → debate → gate por
percepción humana → fusiona o revierte). `/ensure-engine <motor> [--confirmed]` es el comando
manual del contrato comprobar-primero para provisionar un motor pesado.

### MCP (`.mcp.json`)

Cuatro servidores registrados vía launcher perezoso: `ego-memory`, `ego-simbionte`, `ego-toolbelt`
(los tres puentean a `E:\skill\ego\.venv` mediante `.claude/mcp-launchers/ego.mjs`) y
`codebase-memory` (`.claude/mcp-launchers/codebase-memory.mjs`, no descarga nada hasta la primera
llamada real).

## Plataformas

El SO **completo** —hooks, comandos, agentes, skills y MCP— solo corre en **Claude Code**.
**Claude Desktop** recibe los servidores MCP (`ego-memory`, `ego-simbionte`, fusionados de forma no
destructiva en `claude_desktop_config.json` por `install.ps1`, con backup previo) y las skills que
no dependen de hooks; no hay debug-loop automático ni gate de seguridad activo ahí. **Web**
(claude.ai Projects) recibe `CLAUDE.md` + las reglas como instrucciones de proyecto: `install.ps1`
genera `dist/web/PROJECT-INSTRUCTIONS.md` (kernel + rules concatenados) para pegar directamente en
la configuración del Project. `pxpipe` es infraestructura opt-in, OFF por defecto y nunca se activa
en Opus (`docs/PXPIPE.md`).

## Documentación

- [`docs/BUILD-STATE.md`](docs/BUILD-STATE.md) — ancla de resumibilidad: fases hechas, siguiente
  paso, descubrimientos de la máquina.
- [`docs/CHECK-FIRST.md`](docs/CHECK-FIRST.md) — la filosofía comprobar-primero con ejemplos reales
  del propio `install.ps1`/`ensure.mjs`.
- [`docs/PXPIPE.md`](docs/PXPIPE.md) — qué es pxpipe, por qué OFF por defecto y por qué nunca Opus.
- [`docs/CLAUDE.local.example.md`](docs/CLAUDE.local.example.md) — plantilla de
  `~/.claude/CLAUDE.local.md` para declarar tus rutas locales (`EGO_ROOT`, `GODOT_BIN`,
  `FFMPEG_BIN`, `CBM_BIN`, `EGO_PXPIPE`).
- [`engagement/README.md`](engagement/README.md) + `engagement/scope.json.example` — cómo declarar
  hosts propios autorizados para el invariante inward-only.
- Specs y planificación originales en la raíz (`EGO-SKILL-PLAN.md`, `EGO-TOOLBELT-MCP-PLAN.md`) y en
  `persona/` (`Volutaddelego.md`, `research_egos_individuales-para-revisar.md`) — investigación de
  base que referencian las skills EGO, no documentación operativa del SO.

`docs/PLATFORMS.md` y `docs/ARCHITECTURE.md`, mencionados como referencia en `CLAUDE.md`, **todavía
no existen** en el repo — son parte del entregable de F7 (ver siguiente sección).

## Estado actual

El repo está en la fase **F7 · Multiplataforma**, la última de `docs/BUILD-STATE.md`: F0–F6 están
cerradas y verificadas (esqueleto, kernel, debug-loop, skills+agentes+comandos, harness
comprobar-primero, motores completos, pxpipe). Lo que falta, sin adornar:

- **Binario de `codebase-memory`**: el motor está cableado (launcher + `.mcp.json`), pero el
  binario prebuilt (DeusData v0.8.1) todavía no se ha descargado en esta máquina — es una descarga
  de un ejecutable externo, así que queda gateada tras `/ensure-engine codebase-memory --confirmed`
  y requiere tu confirmación explícita. Sin compilador C en la máquina, build-from-source no es
  una alternativa real hoy.
- **`docs/PLATFORMS.md`, `docs/ARCHITECTURE.md`, `SETUP-PROMPT.md`**: referenciados desde el kernel
  o planeados para el entregable multiplataforma, aún no escritos.

Nada de esto bloquea usar el SO tal como está: las 12 skills, los hooks, los agentes y los
comandos funcionan hoy sobre lo que ya hay instalado en la máquina.

## Contacto

Autor: hugouchija44 · [hugouchija44@gmail.com](mailto:hugouchija44@gmail.com) ·
[github.com/DasikuHp](https://github.com/DasikuHp). No hay un `LICENSE` único en la raíz del repo;
cada `SKILL.md` declara `MIT` en su propia cabecera de frontmatter.
