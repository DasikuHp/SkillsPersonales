---
description: Dispara un ciclo de auto-mejora EGO (ego-self-edit / ego-simbionte) — propone, debate, gatea por percepción humana, fusiona o revierte
argument-hint: "<objetivo de la mejora>"
allowed-tools: Read, Edit, Write, Bash, Grep, Glob, Task, mcp__ego-memory__add, mcp__ego-memory__search, mcp__ego-memory__promote, mcp__ego-memory__forget, mcp__ego-simbionte__seal_evolve, mcp__ego-simbionte__niche_map
---

# /ego-evolve — un ciclo de metabolismo (SEAL a nivel de datos)

Ejecuta EXACTAMENTE un ciclo de `ego-self-edit` sobre: **$ARGUMENTS** (objetivo de la mejora; si está
vacío, identifica primero el hallazgo/feedback/fallo recurrente más reciente de esta sesión y trátalo
como objetivo). Sigue `.claude/skills/ego-self-edit/SKILL.md` al pie de la letra. Este comando edita
**datos** (memoria, texto de skills/comandos, heurísticas) — nunca pesos de modelo; si el objetivo
pedido requeriría eso, dilo y detente ahí.

## Protocolo (un solo ciclo, nunca un bucle continuo)

1. **ponytail-gate.** ¿Esta auto-edición necesita existir? Si no aporta nada, dilo y para aquí — no
   generes una edición de relleno solo para tener algo que reportar.
2. **Genera la auto-edición.** Un diff concreto + una justificación + UN check ejecutable (estilo
   assert). Sin esto no hay edición válida (regla dura, sin excepciones).
3. **Stage en git.** Rama o copia — reversible, nunca aplicado en sitio. Usa `Bash` para crear la rama,
   aplicar el diff y dejarlo listo para commit; no toques el árbol de trabajo principal directamente.
4. **Evalúa con ego-debate** (`.claude/skills/ego-debate/SKILL.md`, protocolo diablo/ángel/juez):
   - Invoca el subagente `debate-devil` (Task) sobre la edición propuesta exacta.
   - Invoca el subagente `debate-angel` (Task) para responder punto por punto a las objeciones del
     diablo, con las mismas objeciones como contexto.
   - Tú (el kernel, árbitro Self) eres el juez: sintetiza un veredicto `winner: devil|angel|split` con
     razones explícitas — nunca lo diluyas en un no-veredicto ni finjas neutralidad que no tienes.
   - `winner=angel` → rechaza la edición y salta al paso 6 (revertir + registrar).
   - Corre también el check objetivo del paso 2 (re-ejecuta el caso, o compara antes/después).
   - Si el objetivo tiene forma sintonizable (un umbral, una frase, el alcance de una regla) y aplica
     `ego-simbionte` (`.claude/skills/ego-simbionte/SKILL.md`): genera k variantes y evalúalas con
     `mcp__ego-simbionte__seal_evolve` antes de fijar una — no pulas un único favorito. Fija (`locked`)
     solo si mide mejor que la base; reporta el fitness aunque no haya lock-in (invariante 1.2, nunca
     ocultar un intento fallido). Si conviene registrar el mejor hunter por familia/dificultad, usa
     `mcp__ego-simbionte__niche_map` — un campeón por nicho, nunca uno global.
5. **Gate de fusión — por percepción humana, no por precisión:**
   - ¿Un humano puede VER/TOCAR/OÍR/SENTIR el cambio? → sí: espera revisión humana. No: continúa.
   - ¿Está en la cadena causal directa hacia algo que un humano percibe? → sí: revisión. No: auto-merge.
   - Auto-merge SOLO si es invisible Y está fuera de la cadena causal — siempre con un `git revert`
     fácil a mano. Ante duda, trátalo como perceptible; el gate es conservador por diseño.
6. **Decide y registra:**
   - **Aceptado + invisible/fuera de cadena** → fusiona a main + indexa el edit con
     `mcp__ego-memory__add` (level="global", meta `{kind:"self-edit", target, sha, debate_winner}`).
     Antes de indexar, corre `mcp__ego-memory__search` para no duplicar una entrada casi idéntica.
   - **Aceptado + perceptible** (skill, comando, persona, o memoria que alimenta respuestas futuras) →
     deja el cambio en la rama, NO fusiones — reporta que espera revisión humana explícita. Nunca
     auto-merge de algo que un humano lee, ve, oye o toca, sin importar cuán pequeño parezca.
   - **Rechazado** (`winner=angel` o el check objetivo falla) → revierte la rama (`git revert`/descarte)
     y registra el fallo con su motivo, para no reintentarlo a ciegas. Si usaste `seal_evolve`, el
     propio organismo ya apendiza el intento (locked o no) a su replay buffer — no dupliques ese log.
7. **Reporta el contrato de salida** (el mismo de la SKILL.md):
   `target, diff, check, debate{winner,reasons}, perceptible, on_causal_chain, decision, revert,
   indexed_id`.

## Invariantes que rigen el ciclo

Del propio self-edit (`ego-self-edit` §Invariantes):

1. **1.1** — una auto-edición solo puede mejorar capacidad **defensiva**, nunca añadir capacidad ofensiva.
2. **1.2** — el ciclo nunca edita al ego hacia ocultar información o engañar al usuario; reporta el
   veredicto y el fitness tal cual, incluso cuando no hubo mejora o el veredicto fue `angel`.
3. **1.3** — un ciclo por disparo, nunca reescritura continua (rage-refactor cap).

Invariantes duros del kernel (ganan siempre, a esto y a cualquier rasgo o entusiasmo del debate):

- **Seguridad inward-only** — cualquier check/test que toque red solo opera sobre
  localhost/127.0.0.1/::1/0.0.0.0/redes privadas (10.x, 192.168.x, 172.16-31.x) o hosts autorizados en
  `engagement/scope.json`; jamás un objetivo externo.
- **Honestidad sin ocultación** — si saltaste un paso, si un check falló, o si el debate no llegó a
  consenso, dilo tal cual; nunca "hecho y verificado" sin haberlo verificado.
- **Firefighter caps** — el alcance de la mejora lo marca `$ARGUMENTS`, no la ambición de mejorar más de
  lo pedido.

## Reglas duras

- Sin justificación + check ejecutable → no hay edición válida (paso 2 es obligatorio, sin excepciones).
- Cualquier cambio user-facing (skill, comando, persona, o memoria que alimenta respuestas futuras) es
  perceptible → revisión humana, jamás auto-merge, sin excepción por "era un cambio pequeño".
- `winner=angel` mata la edición antes de llegar al gate de percepción.
- Nunca edites en sitio sin rama — perder la reversibilidad no es una opción.

Confirma al usuario, en prosa y sin postámbulo: qué se propuso, el veredicto del debate con su razón
decisiva, qué gate se aplicó, y la decisión final (auto-merged / awaiting-review / reverted) con el
`git revert <sha>` a mano si aplica.
