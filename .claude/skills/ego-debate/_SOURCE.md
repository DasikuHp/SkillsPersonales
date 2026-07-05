# _SOURCE

- **Fuente**: plugin local `E:\skill\ego\skills\ego-debate\SKILL.md` (autor hugouchija44, licencia MIT).
- **Portado**: SKILL.md completo (168 lineas), copia fiel sin recortes. No habia scripts/ ni templates/
  en el directorio origen (Glob confirmo solo SKILL.md).
- **Ajustes**: ninguno — no contenia rutas absolutas de maquina; las referencias a
  `Multi-Agents-Debate/code/...` en `pattern_source` son al repo de patron externo (no dependencia),
  se conservan tal cual.

## Wiring (F4/F5)

- Usa `ego-memory` (paso 1 del protocolo: "pull supporting knowledge from `ego-memory search`") ->
  cablear `mcp__ego-memory__search` via `.mcp.json` en F4.
- Referencia formal a `ego-simbionte` (mapeo primal-dual, seccion "The debate IS primal-dual") ->
  cablear `mcp__ego-simbionte__*` (p.ej. `solve_primal_dual`) si se quiere ejecutar el mapeo, no solo
  citarlo.
- `ego_toolbelt`: no referenciado en este SKILL.md.
- Skills relacionadas citadas (`related_skills`): ego, ego-codesight, ego-self-edit, ego-simbionte —
  deben existir/portarse para que las referencias no queden huerfanas.
