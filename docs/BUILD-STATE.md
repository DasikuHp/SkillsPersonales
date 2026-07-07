# EGO OS — Estado de construcción

Ancla de resumibilidad: si la sesión se agota, retoma desde aquí.

## Fases
- [x] **F0 · Esqueleto** — rama, árbol `.claude/`, `.gitignore`, hooks (lib + 4 hooks), `settings.json`.
      Smoke test OK: hooks devuelven JSON; gate seguridad bloquea externo / permite localhost; debug-loop
      avisa a la 15ª y resetea en verde.
- [x] **F1 · Kernel** — `CLAUDE.md` (8 secciones) + `rules/` (00-security-inward, 05-ego-invariants,
      10-altitude, 20-iteration, 30-debug-loop, 40-check-first, 60-skills-first).
- [x] **F2 · Debug-loop** — comando `/debug-loop` (hooks ya implementados en F0). Verificado: ronda 15 emite
      aviso; test verde + `stop.mjs` resetea el contador a 0.
- [x] **F3 · Skills EGO + agentes** — 8 skills EGO **portadas fielmente** desde `E:\skill\ego` (line-count
      exacto a la fuente) con `_SOURCE.md` de procedencia; 6 agentes (debate-devil/angel/judge, code-reviewer,
      appsec-red/blue con invariante inward-only explícito y no-evasión del hook); 5 comandos (/ego-status,
      /ego-facet, /ego-debate→devil→angel→judge, /ego-remember, /ego-evolve). Vía workflow multi-agente (19
      agentes, tiering haiku/sonnet-5/fable-5), 0 errores.
- [x] **F4 · Harness comprobar-primero** — `.claude/ensure.mjs` (contrato: locate check-first → gate
      `--confirmed` para pesados → sentinel con hash en `~/.claude/engines-build/`; idempotente); `.mcp.json`
      + launchers `.claude/mcp-launchers/{ego,codebase-memory}.mjs` (resuelven venv/binario o piden
      `/ensure-engine`); comando `/ensure-engine`. Verificado: ego→no-op idempotente (exit 0), codebase-memory
      pesado→rechaza sin confirmación (exit 3), venv E: importa ego_memory/ego_simbionte/fastmcp/pysat/fastembed.
- [x] **F5 · Motores completos** — 4 engine-skills reales cableadas a lo presente (SIN stubs): codebase-memory
      (SKILL+_SOURCE; motor vía .mcp.json+launcher, binario prebuilt gated por /ensure-engine), video-production
      (ffmpeg 8.1 presente), godot-rpg (Godot 4.3 mono + validador GDScript cascada real: gdlint→godot
      --check-only→lint; probado OK/parse-error), appsec-inward (red+blue inward, invariante explícito, cableado
      a agentes+ego-toolbelt+rule+hook). ensure.mjs con descriptores locate check-first para los 5 (ego/video/godot/
      appsec exit0, cbm gate exit3). engagement/scope.json.example+README. SEAL/SAT: ego-self-edit/ego-simbionte
      ya portadas (F3) + MCP vivo (F4); SEAL en E:\skill\ego\seal + E:\chimera\SEAL. Vía workflow (6 agentes, 0 err).
- [x] **F6 · pxpipe** — gating por modelo en `session-start.mjs` (opt-in EGO_PXPIPE/state, OFF default, omite en
      Opus, portOpen check-first); fix `listInstalledEngines` (nombres de sentinel reales); `docs/PXPIPE.md`;
      opt-in expuesto en `install.ps1 -EnablePxpipe`. Verificado: fable arranca, Opus omite.
- [x] **F7 · Multiplataforma + entregable B** — `install.ps1` (aditivo/idempotente/reversible: backup+merge,
      NO clobbea; 56 ficheros; hooks net-new PostToolUse+Stop; MCP check-first; Desktop merge; dist/web export;
      pxpipe opt-in; smoke test) y `uninstall.ps1` (manifest + strip hooks EGO por nombre sin tocar caveman +
      quita bloque kernel + conserva engines-build). Docs: ARCHITECTURE, PLATFORMS, CHECK-FIRST,
      CLAUDE.local.example, SETUP-PROMPT (entregable B, arranque en frío). **INSTALADO Y TESTEADO en la máquina
      real**: smoke verde (session-start, gate externo→block, gate local→permite, ensure no-op); el gate
      inward-only bloqueó un `nmap example.com` en la sesión viva (verificación end-to-end); uninstall -DryRun OK.

## Estado: F0→F7 COMPLETO y verificado. EGO OS instalado y activo en ~/.claude (aditivo, reversible).

## Corrección post-F5 (auditoría de seguridad, 2026-07-06)
Al revisar el repo de nuevo se detectó que `ensure.mjs` descargaba por defecto un binario prebuilt desde
`DeusData/codebase-memory-mcp` — un org que el usuario nunca verificó explícitamente. Aunque el `LICENSE`
del fork `dasikuhp/codebase-memory-mcp` sí confirma a DeusData como copyright holder legítimo del upstream,
auto-descargar y vendorizar un binario de terceros para correrlo como servidor MCP es un riesgo de cadena
de suministro que el SO no debe asumir en silencio (bloqueado por el clasificador de seguridad del propio
harness). Decisión del usuario: **compilar desde `dasikuhp/codebase-memory-mcp`** (la fuente ya auditada,
en su propio scope) en vez de confiar en el binario de un tercero.

`ensure.mjs` se corrigió: `install()` ya no descarga nada por defecto; `--from-source` ahora SÍ compila de
verdad (localiza el repo fuente vía `CBM_SRC`/convención de hermano/`engines-build/codebase-memory-src`,
corre `scripts/build.sh` con `bash`, copia el binario resultante). **Validado end-to-end en sandbox Linux**:
build real (~2m30s, ~257MB — 158 grammars tree-sitter + vectores nomic embebidos), `codebase-memory-mcp
0.8.1` responde a `--version`, sentinel escrito, segunda pasada no-op, launcher MCP lo encuentra y ejecuta.
El binario compilado **no se vendorizó en git** (GitHub rechaza archivos >100MB; y sería un ELF Linux,
inútil en el Windows del usuario de todos modos).

## Único pendiente (real, no bloqueante)
- **codebase-memory binario en la máquina Windows real**: el motor está 100% cableado y el build real ya
  se validó en Linux. Falta que la propia máquina Windows tenga un compilador C/C++ (gcc/clang, p.ej. vía
  MSYS2/mingw-w64) y `bash` en PATH (Git Bash ya trae uno) para que `/ensure-engine codebase-memory
  --confirmed --from-source` compile ahí. Sin eso, `ensure.mjs` falla con un mensaje claro (no finge éxito).
  NO bloquea el resto del SO: el launcher solo pide provisión cuando se invoca el MCP `codebase-memory`.

## Descubrimientos de la máquina (check-first, 2026-07-06)
- Existe `E:\skill\ego\` = plugin EGO completo y funcionando (autor hugouchija44): `.venv` con pysat, MCP
  servers `ego_memory`/`ego_simbionte`/`ego_toolbelt` (Python, ya conectados), 8 skills con SKILL.md, `seal/`,
  tests. Los MCP `ego-memory`/`ego-simbionte` de la sesión salen de aquí. → F3/F5 consolidan, no reconstruyen.
- Registro MCP EGO: `claude mcp add -s user <n> -e PYTHONPATH=E:\skill\ego\mcp -- E:\skill\ego\.venv\Scripts\python.exe -m <mod>`.
- Repos SAT/SEAL locales: `E:\chimera\SEAL`, `E:\skill\{Multi-Agents-Debate,hermes-CCC,mythos-agent,SEAL}`.
- Entorno: git/node24/npm/python3.13/ffmpeg8.1 presentes; **sin compilador C**; Godot 4.3 (Desktop) + otro en C.
- codebase-memory-mcp: binario prebuilt Windows oficial existe (DeusData v0.8.1); descarga auto-bloqueada
  (exe externo). Decisión pendiente en F5: build-from-source (autorizado) vs. binario prebuilt (requiere OK).
- Triaje de secretos en `E:\skill\ego`: limpio (solo referencias a la tool defensiva `sec.mythos_secrets`).

## Notas de diseño
- Todo runtime state en `~/.claude/state/` (gitignored); binarios en `~/.claude/engines-build/` (gitignored).
- Hooks en Node puro (v18+), Windows-compatible, sin bash.
- Specs originales EGO en la raíz del repo (EGO-SKILL-PLAN.md, Volutaddelego.md, etc.); `docs/sources/` las referencia.
