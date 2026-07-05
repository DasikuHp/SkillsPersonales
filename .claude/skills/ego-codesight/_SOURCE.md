# _SOURCE — ego-codesight

**Fuente:** plugin local `E:\skill\ego\skills\ego-codesight\SKILL.md` (autor hugouchija44,
licencia MIT). Es la única skill del plugin real para percepción defensiva de código; no
tenía `scripts/` ni `templates/` (Glob confirma un solo fichero en el directorio origen).

**Qué se portó:** copia fiel e íntegra del `SKILL.md` (145 líneas, formato hermes con
frontmatter name/description/version/author/license/metadata). Sin recortes, sin stubs.
No había rutas absolutas de máquina que ajustar.

**Wiring (pendiente, no ejecutado aquí):**
- Backing tools `sec.mythos_scan/secrets/endpoints/iac/results/score` se exponen bajo el
  namespace `sec.*` vía el gateway MCP **`ego-toolbelt`** (proxy de mythos-agent, whitelist
  defensivo — excluye `hunt/pentest/variants`). Se cablea en F4 vía `.mcp.json`.
- Lee de/escribe en **`ego-memory`** (recall previo de CWE, persistencia de hallazgos
  confirmados) — MCP `ego_memory`, mismo cableado F4.
- Triaje de confianza media/baja delega en la skill `ego-debate` (ya portada, sin motor MCP).
- Referencia opcional a `ego-self-edit` (SEAL) para heurísticas recurrentes — fuera de alcance
  de este porte.

**Estado:** portado 1:1. Pendiente de activación real hasta que `ego-toolbelt` (gateway) y
`ego-memory` (MCP) existan y se registren en `.mcp.json`.
