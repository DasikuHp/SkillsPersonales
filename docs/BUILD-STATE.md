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
- [ ] **F4 · Harness comprobar-primero** — `ensure.mjs` estándar + sentinels + `.mcp.json` + `/ensure-engine`.
- [ ] **F5 · Motores completos** — codebase-memory (C), video-production, godot-rpg, appsec-inward + stubs SEAL/SAT.
- [ ] **F6 · pxpipe** — gating por modelo ya en `session-start.mjs`; falta doc/opt-in en install.
- [ ] **F7 · Multiplataforma + entregable B** — install.ps1 completo, uninstall.ps1, dist/web, SETUP-PROMPT.md, PLATFORMS.md.

## Siguiente paso
F3: consolidar skills EGO desde `E:\skill\ego` (plugin real del usuario: 8 skills hermes, 3 MCP servers
Python vivos, SEAL, venv SAT) + 6 agentes debate/appsec + comandos. Check-first: portar+cablear, no reescribir.

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
