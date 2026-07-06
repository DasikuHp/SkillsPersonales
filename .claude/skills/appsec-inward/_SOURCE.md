# _SOURCE — appsec-inward

## Procedencia

**Referencia conceptual (no cableada):** el patrón "un mismo sistema hace red team **y** blue team sobre
sí mismo" está inspirado en la idea de un simbionte ofensivo-defensivo (tipo *refinefble/symbiote*). Esa
referencia es **puramente conceptual**: **no se halló por nombre en la máquina** (grep sobre el repo no
devuelve `refinefble` ni `symbiote`; la única coincidencia cercana es el motor `ego-simbionte`/`symbiote`
de SAT en `session-start.mjs`, que es otra cosa — orquestación de facetas, no appsec). No hay ningún
paquete, repo ni binario de red+blue de terceros detrás de esta skill.

**Qué implementa de verdad (todo YA presente en el repo — sin stubs):** esta skill es un **orquestador**
que cablea piezas reales que ya existen en EGO OS:

- Agente **`appsec-red`** — `.claude/agents/appsec-red.md` (red team inward-only, tools Read/Grep/Glob/Bash).
  Verificado presente.
- Agente **`appsec-blue`** — `.claude/agents/appsec-blue.md` (blue team/parcheo, tools Read/Grep/Glob/
  Edit/Write/Bash). Verificado presente.
- Gateway **`ego-toolbelt`** exponiendo la familia defensiva `sec.mythos_*` bajo namespace `sec.*`
  (`scan/secrets/endpoints/iac/results/score`). El gateway **excluye por diseño** la capacidad ofensiva
  (`hunt/pentest/variants` no registrados). Consumido a través de la skill `ego-codesight`
  (`.claude/skills/ego-codesight/SKILL.md`, verificada presente).
- Invariante **inward-only** — `.claude/rules/00-security-inward.md` (regla 00, máxima precedencia).
  Verificado presente. Reforzado en `CLAUDE.md §3.1` y `rules/05-ego-invariants.md`.
- Hook de bloqueo — `.claude/hooks/post-tool-use.mjs` (vía `lib/security.mjs`): inspecciona comandos de
  red/ofensivos y devuelve `decision: block` para targets fuera de scope. Verificado presente.
  `user-prompt-submit.mjs` reinyecta el invariante cuando el prompt toca seguridad.
- Directorio de engagement — `engagement/README.md` + `engagement/scope.json.example` presentes;
  `scope.json` real lo crea el usuario (gitignored). Formato `{ targets, authorized_by, note }`.

**Honestidad (invariante 2):** la parte *refinefble/symbiote* es solo un nombre de referencia para el
concepto red+blue; **no está cableada a nada** porque no existe en la máquina. Lo cableado y verificado es
lo del punto anterior: agentes appsec-red/blue + gateway defensivo `sec.*` + rule 00 + hook. No se
inventó ningún componente ni se dejó ningún stub.

## Wiring

- **Agentes:** la skill delega la fase ofensiva en el subagente `appsec-red` y la defensiva/parcheo en
  `appsec-blue`. Ambos ya registrados en `.claude/agents/`; no requieren cableado adicional en `.mcp.json`
  (son agentes, no MCP).
- **Tooling `sec.*`:** llega vía el MCP `ego-toolbelt` (gateway FastMCP, proxy defensivo de mythos-agent),
  el mismo que consume `ego-codesight`. Activo cuando `ego-toolbelt` está registrado en `.mcp.json` y
  arrancado. Si está caído, la skill degrada a razonamiento manual desde código + `ego-memory` y lo
  declara — nunca fabrica scans (invariante 2).
- **Memoria:** hallazgos confirmados se persisten en `ego-memory` (MCP `ego_memory`) para recall en
  auditorías futuras; triaje de confianza media/baja pasa por `ego-debate`.
- **Comprobar-primero:** `/ensure-engine appsec-inward` antes de arrancar; idempotente (`rules/40`). La
  skill no instala motores pesados por sí sola.
- **Índice del kernel:** listada en `CLAUDE.md §6` como `appsec-inward` ("atacar+defender TU app") y en
  el mapa tarea→skill de `rules/60-skills-first.md`.

## Estado

Cableada a piezas reales, sin stubs. Depende de que `ego-toolbelt` (gateway `sec.*`) esté registrado y
arrancado para la fase de percepción; los agentes `appsec-red`/`appsec-blue`, la rule 00 y el hook ya
están operativos. El invariante inward-only aplica siempre, con gateway o sin él.
