---
description: Persist or recall context via the ego-memory MCP (hippocampus)
argument-hint: "<texto a recordar | consulta a buscar>"
allowed-tools:
  - mcp__ego-memory__add
  - mcp__ego-memory__search
  - mcp__ego-memory__promote
---

# EGO Remember

Fuerza un ingest (o recall) explícito en la memoria adaptativa `ego-memory`. $ARGUMENTS es el texto a
recordar (modo add) o la consulta a recuperar (modo search) — si la intención no es clara, trátalo como
add.

**Implementación:**

1. Antes de nada, llama a `search(query=$ARGUMENTS, k=5)` sobre todos los niveles para deduplicar: si ya
   existe una memoria casi idéntica, no crees un duplicado — actualiza su `meta` si aporta algo nuevo y
   repórtalo así.
2. Si no hay duplicado y la intención es persistir, llama a `add(text=$ARGUMENTS, level, meta)`:
   - `level` por defecto `"project"`.
   - `"session"` si el contenido es claramente efímero (solo relevante a esta conversación).
   - `"global"` solo si es conocimiento ampliamente reusable entre proyectos (p.ej. una convención
     general, no un detalle de este repo).
   - `meta` describe fuente y tipo: al menos `{kind, source}` (usa el esquema de `ego-memory` SKILL.md,
     p.ej. `kind: "decision"`, `"finding"`, `"note"` según corresponda).
3. Si la intención es claramente una consulta (buscar, no guardar), usa los resultados de `search` del
   paso 1 como respuesta y no llames a `add`.
4. Si algo recuperado o guardado ha demostrado reusarse (se repite en más de un proyecto o ha sido
   consultado repetidamente), llama a `promote(id, to_level)` para subirlo de nivel
   (session → project → global).
5. Confirma al usuario: id, nivel final y si fue add/dedup/promote/search-only.

**Reglas duras (ponytail — invariante 3, restricción):**
- Nunca guardes secretos, credenciales ni material ofensivo. Si $ARGUMENTS parece contener alguno, no lo
  persistas: repórtalo y explica por qué se rechazó.
- No guardes ruido — solo lo que realmente se va a reusar. Ante duda, prioriza no guardar.
