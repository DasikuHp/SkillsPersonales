# Procedencia

- **Fuente:** plugin local `E:\skill\ego\skills\ego-memory\SKILL.md` (autor hugouchija44, licencia MIT).
- **Portado:** SKILL.md completo, copia fiel (154 lineas). Sin cambios de contenido; no habia
  referencias a rutas de maquina que ajustar (`~/.claude/ego-memory/` ya es relativo al home).
- **No portado:** el skill dir origen solo contenia `SKILL.md` (glob confirmado, sin `scripts/` ni
  `templates/` propios). El SKILL.md referencia `scripts/ingest_corpus.py` y `persona/memoria/`, que
  viven a nivel de plugin (`E:\skill\ego\scripts\ingest_corpus.py`), no dentro del dir de la skill —
  fuera de alcance de este porte; `persona/memoria/` (corpus PrimeVul/exploitgym) no existe aun en el
  plugin origen.

## Wiring (F4/F5)

- MCP server real: `E:\skill\ego\mcp\ego_memory` → cablear como `ego_memory` en `.mcp.json` (F4).
  Tools esperadas: `add`, `search`, `promote`, `forget` (coinciden con `mcp__ego-memory__*` ya visibles
  en el harness).
- Relacion con otras skills EGO (`ego`, `ego-codesight`, `ego-self-edit`) — se cablean cuando esas
  skills se porten en F3.
