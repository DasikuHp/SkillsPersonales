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

## Único pendiente (opcional, gated)
- **codebase-memory binario**: motor 100% cableado (skill+ensure+launcher+.mcp.json). Falta provisionar el
  binario: `/ensure-engine codebase-memory --confirmed` descarga el prebuilt oficial (en la PowerShell del
  usuario no se bloquea), o `--from-source` compila (necesita toolchain C, ausente). Requiere OK del usuario
  sobre la fuente. NO bloquea nada: el launcher pide provisión cuando se invoque el MCP.

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
