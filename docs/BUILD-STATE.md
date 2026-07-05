# EGO OS — Estado de construcción

Ancla de resumibilidad: si la sesión se agota, retoma desde aquí.

## Fases
- [x] **F0 · Esqueleto** — rama, árbol `.claude/`, `.gitignore`, hooks (lib + 4 hooks), `settings.json`.
      Smoke test OK: hooks devuelven JSON; gate seguridad bloquea externo / permite localhost; debug-loop
      avisa a la 15ª y resetea en verde.
- [x] **F1 · Kernel** — `CLAUDE.md` (8 secciones) + `rules/` (00-security-inward, 05-ego-invariants,
      10-altitude, 20-iteration, 30-debug-loop, 40-check-first, 60-skills-first).
- [ ] **F2 · Debug-loop** — comando `/debug-loop` (hooks ya implementados en F0).
- [ ] **F3 · Skills EGO + agentes** — ego-* ligeras nativas + 6 agentes + comandos.
- [ ] **F4 · Harness comprobar-primero** — `ensure.mjs` estándar + sentinels + `.mcp.json` + `/ensure-engine`.
- [ ] **F5 · Motores completos** — codebase-memory (C), video-production, godot-rpg, appsec-inward + stubs SEAL/SAT.
- [ ] **F6 · pxpipe** — gating por modelo ya en `session-start.mjs`; falta doc/opt-in en install.
- [ ] **F7 · Multiplataforma + entregable B** — install.ps1 completo, uninstall.ps1, dist/web, SETUP-PROMPT.md, PLATFORMS.md.

## Siguiente paso
F3: implementar las skills EGO ligeras y los agentes de debate/appsec.

## Notas de diseño
- Todo runtime state en `~/.claude/state/` (gitignored); binarios en `~/.claude/engines-build/` (gitignored).
- Hooks en Node puro (v18+), Windows-compatible, sin bash.
- Specs originales EGO en la raíz del repo (EGO-SKILL-PLAN.md, Volutaddelego.md, etc.); `docs/sources/` las referencia.
