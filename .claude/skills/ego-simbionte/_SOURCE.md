# Procedencia

- **Fuente:** plugin local `E:\skill\ego\skills\ego-simbionte\SKILL.md` (autor hugouchija44, licencia MIT).
- **Portado:** SKILL.md completo, copia fiel (145 lineas de cuerpo + frontmatter hermes). El dir
  fuente no contiene mas ficheros (sin scripts/, sin templates/) — confirmado con Glob recursivo.
- **Ajustes:** ninguno. No se hallaron rutas absolutas de maquina en el cuerpo (el unico path,
  `~/.claude/ego-simbionte/seal_buffer.jsonl`, ya es relativo a home). Frontmatter y contenido
  identicos al original.

## Wiring pendiente (F4/F5)

- Skill depende del **MCP server `ego-simbionte`** (frontmatter: `server: [mcp/ego_simbionte]`;
  tools ya visibles en este runtime como `mcp__ego-simbionte__*`: generate, load_dimacs, triage,
  solve_primal_dual, gauss_detect, levin_hunt, seal_evolve, niche_map, metabolic_cycle).
  Cablear el binario/proceso real via `.mcp.json` en F4.
- Tambien referencia **ego-memory** (persistir gap bands, mejoras SEAL, cambios de campeon de nicho)
  — MCP `ego-memory` ya presente en este runtime (add/search/promote/forget).
- `related_skills`: [ego, ego-debate, ego-self-edit, ego-memory] — ego-debate y ego-self-edit aun
  no portadas; cablear cuando existan en el repo OS.
