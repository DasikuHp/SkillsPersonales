# Procedencia

- **Fuente**: plugin local `E:\skill\ego\skills\ego\SKILL.md` (autor hugouchija44, licencia MIT).
- **Portado**: SKILL.md completo (182 líneas, formato hermes con frontmatter name/description/
  version/author/license/metadata). No había `scripts/`, `templates/` ni otros ficheros en el
  directorio origen (Glob confirmó solo SKILL.md) — nada más que portar.
- **Cambios**: ninguno en el cuerpo. Copia fiel 1:1. Las referencias a `persona/Volutaddelego.md` y
  `persona/research_egos_individuales-para-revisar.md` se dejan tal cual (son parte del ecosistema
  EGO, no rutas de máquina).

## Wiring pendiente (F4/F5)

- No consume un MCP server directamente en este SKILL.md, pero **enruta** a otras skills EGO que sí
  lo hacen: `ego-memory` (mcp__ego-memory__*), `ego-simbionte` (mcp__ego-simbionte__*), `ego-toolbelt`
  (herramientas `sec.*`). Estos se cablean vía `.mcp.json` en F4.
- Depende también de `ego-restraint`, `ego-debate`, `ego-self-edit`, `ego-codesight` — todas listadas
  en `metadata.ego.related_skills` — que deben portarse por separado para que el routing funcione.
