# Source

- Fuente: plugin local `E:\skill\ego` (repo real del usuario, no mockup).
- Autor original: hugouchija44. Licencia: MIT.
- Portado: `SKILL.md` completo (148 lineas), copia fiel sin recortes. No habia
  `scripts/` ni `templates/` en el directorio origen (Glob confirmo un unico
  fichero: SKILL.md).
- Sin ajustes de ruta: el cuerpo no referencia paths absolutos de maquina,
  solo comandos de paquete (`npx mythos-agent`, `python -m ego_toolbelt`).

## Wiring pendiente (F4/F5)

- MCP server: `ego_toolbelt` (FastMCP gateway) — cablear en `.mcp.json` como
  server `ego-toolbelt`, transporte stdio, comando `python -m ego_toolbelt`.
- Depende de que el MCP upstream `mythos-agent` este construido
  (`npm install && npm run build`) antes de arrancar el gateway.
- `related_skills` en el frontmatter (`ego`, `ego-codesight`, `ego-debate`)
  aun no portadas a este repo — cablear cuando existan.
