# _SOURCE — ego-self-edit

**Fuente:** plugin local `E:\skill\ego\skills\ego-self-edit\SKILL.md`
**Autor:** hugouchija44 · **Licencia:** MIT

**Portado:** SKILL.md completo (177 líneas, formato hermes), copia fiel sin recortes.
El dir de la skill solo contenía `SKILL.md` — no había `scripts/` ni `templates/` que portar.

**No portado (fuera de alcance de este paso):** el frontmatter referencia
`entrypoint: [seal/self_edit.py, commands/ego-evolve.toml]`, que viven en la raíz del
plugin (`E:\skill\ego\seal\self_edit.py`, `E:\skill\ego\commands\ego-evolve.toml`), no
dentro del dir de la skill. Pendiente de portar en el paso de comandos/scripts del plugin.

**Wiring MCP (cablear en F4 vía `.mcp.json`):**
- `ego_memory` — indexa self-edits aceptados (`kind:"self-edit"`) y se consulta para
  recordar ediciones previas.
- `ego_simbionte` — organo SEAL: evaluación por candidatos (k-variants), replay buffer
  `seal_buffer.jsonl`, niche-mapping antes de promover a memoria global.
- Skills relacionadas (cablear como referencias, no MCP): `ego`, `ego-debate`,
  `ego-restraint`.
