# Procedencia

- **Motor upstream real:** [`DeusData/codebase-memory-mcp`](https://github.com/DeusData/codebase-memory-mcp)
  — "the fastest and most efficient code intelligence engine for AI coding agents." Pure C, zero
  dependencias, binario estático (macOS/Linux/Windows), 158 lenguajes via tree-sitter vendorizado +
  Hybrid LSP para 10 de ellos, grafo de conocimiento persistente en SQLite, 14 tools MCP. Preprint:
  arXiv:2603.27277. Licencia del upstream: **MIT** (`LICENSE`, Copyright (c) 2025 DeusData).
- **Repo clonado en esta máquina:** `C:/claude-SO/_work/codebase-memory-mcp`, remote
  `https://github.com/DasikuHp/codebase-memory-mcp.git` (fork/mirror de trabajo — el contenido de su
  `README.md` referencia consistentemente el proyecto y los badges/releases de `DeusData`, no de
  `DasikuHp`). Este repo es la fuente para `--from-source` y para leer con fidelidad qué hace el motor;
  no se modificó ni se re-escribió — es lectura, no porte de código.
- **Binario prebuilt oficial fijado:** release `v0.8.1`, artefacto Windows amd64
  (`codebase-memory-mcp-windows-amd64.zip`), publicado por `DeusData/codebase-memory-mcp/releases`. Es lo
  que `ensure.mjs` descarga por defecto (ver Wiring).
- **Qué se portó a EGO OS:** únicamente la skill-doc (`SKILL.md` de este directorio), escrita a mano a
  partir de la lectura del `README.md` del motor (secciones Features, MCP Tools, Windows Quick Start,
  Build from Source, Graph Data Model, Environment Variables) y del estilo hermes de `ego-codesight`. No
  se copió código C ni JS del repo upstream — el motor se provee como binario/build vía `/ensure-engine`,
  no vía código fuente incrustado en esta skill.
- **No portado / fuera de alcance:** el propio motor (C), el instalador multi-agente upstream
  (`install.sh`/`install.ps1`, que configuraría hooks `PreToolUse` de Grep/Glob-augment específicos de
  Claude Code) y la UI de visualización 3D (`--ui`, puerto 9749) — ninguno de los dos está cableado en
  este SO; el wiring de EGO OS es el propio (`.mcp.json` + launcher), no el instalador upstream.

## Wiring (ya existente, F4 — esta skill no lo reescribe)

- **`.mcp.json`** (raíz del repo) ya registra el server:
  ```json
  "codebase-memory": { "command": "node", "args": [".claude/mcp-launchers/codebase-memory.mjs"], "env": {} }
  ```
- **Launcher** `.claude/mcp-launchers/codebase-memory.mjs` resuelve el binario check-first, en orden:
  `$CBM_BIN` → `~/.claude/engines-build/codebase-memory/{codebase-memory-mcp.exe, bin/, extracted/}` →
  `PATH`. Si no encuentra nada, imprime el aviso a stderr y sale con código 1 (no crashea silenciosamente,
  no finge que el server arrancó) — señala `/ensure-engine codebase-memory`. Si encuentra el binario, lo
  ejecuta con el subcomando `mcp` (stdio JSON-RPC), tal como documenta el README upstream.
- **Descriptor `ensure`** en `.claude/ensure.mjs` → entrada `'codebase-memory'`: `heavy: true`,
  `version: 'v0.8.1'`. `locate()` comprueba los mismos candidatos que el launcher. **Corrección de
  seguridad (post-F5):** `install()` **ya no descarga el zip prebuilt de `DeusData/codebase-memory-mcp`
  por defecto** — ese org nunca fue verificado explícitamente por el usuario, y auto-descargar un binario
  de terceros para ejecutarlo como servidor MCP es un riesgo de cadena de suministro que el SO no debe
  asumir en silencio. El único camino soportado ahora es **`--from-source`**: localiza el repo clonado de
  `dasikuhp/codebase-memory-mcp` (vía `CBM_SRC`, convención de hermano de directorio, o
  `~/.claude/engines-build/codebase-memory-src`), corre `scripts/build.sh` con `bash` (Git Bash/WSL en
  Windows — el build system es bash+Makefile, no se reimplementó en PowerShell) y copia el binario
  resultante a `~/.claude/engines-build/codebase-memory/`. Validado end-to-end en sandbox Linux: build
  real (~2m30s, ~257MB, `codebase-memory-mcp 0.8.1` responde a `--version`), sentinel escrito, segunda
  pasada no-op. **Pendiente en la máquina Windows real:** requiere un compilador C/C++ (gcc/clang, p.ej.
  vía MSYS2/mingw-w64) que hoy no está instalado ahí — sin él, `--from-source` falla con un mensaje claro
  en vez de fingir éxito.
- **Comando** `.claude/commands/ensure-engine.md` invoca este contrato por nombre (`/ensure-engine
  codebase-memory [--confirmed] [--from-source]`), respetando el gate de confirmación para lo pesado.
- **Estado real en esta máquina (comprobado, no asumido):** `~/.claude/engines-build/codebase-memory/` no
  existe y no hay sentinel `codebase-memory.installed` — el binario **no** está descargado todavía. La
  provisión es opt-in por diseño; nada en esta skill lo descarga automáticamente.

## Relación con otras skills EGO

- `ego-codesight` / agentes `appsec-red`, `appsec-blue` — pueden apoyarse en `codebase-memory` para
  localizar rutas/handlers antes de un escaneo `sec.*` más estrecho (ponytail); no hay dependencia dura,
  cada skill funciona si la otra no está.
- `ego-memory` — capa complementaria: `codebase-memory` recuerda *qué es* el código (grafo estructural,
  vive en `~/.cache/codebase-memory-mcp/` vía SQLite propio del motor); `ego-memory` recuerda *qué se
  aprendió* sobre él (hallazgos, decisiones) vía su propio MCP server `ego_memory`. Cachés y stores
  separados a propósito.
- `ego-toolbelt` — gateway distinto (proxy FastMCP de tools defensivas `sec.*`); `codebase-memory` es su
  propio MCP server directo en `.mcp.json`, no pasa por el toolbelt.
