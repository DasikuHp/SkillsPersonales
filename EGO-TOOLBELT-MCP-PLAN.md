# EGO-TOOLBELT — MCP agregador de herramientas no-adaptables (plan por fases)

> Complementa `EGO-SKILL-PLAN.md`. Aquí va **lo ejecutable/fijo** de los repos (binarios, CLIs,
> servidores). Lo **adaptable** (SEAL como motor, memoria turbovec) **no** entra aquí: vive en
> §4–§5 del plan principal. Regla rectora: **ponytail "lo justo"** — un gateway, no cinco.

---

## 0. Decisión: ¿MCP o skill conjunta? → las dos, con rol distinto

- **Sustancia = un MCP agregador (gateway).** Un único servidor `ego-toolbelt` que expone, bajo un
  solo endpoint, las herramientas fijas de los repos. Es lo que el agente **llama**.
- **Contrato = una skill conjunta.** `skills/ego-toolbelt/SKILL.md` (formato hermes) que documenta
  **cuándo y cómo** usar cada tool, el límite defensivo y el routing. Es lo que el agente **lee**.

Recomendación: construir el MCP primero (Fases 1–4) y la skill como envoltura (Fase 5). Un solo
servidor evita el desorden de "un MCP por proyecto" que ya tienes (ver Fase 0 del plan principal).

---

## 1. Stack (investigado, junio 2026)

- **Gateway: FastMCP 3.0** (Python). Compone servidores con `mount()` (live-link con prefijo de
  namespace), `import_server()` (copia estática) y `FastMCP.as_proxy()` / `create_proxy()` para
  **proxyar cualquier MCP existente** (stdio/sse/http). `MCPConfig`/`MCPConfigTransport` declara
  varios sub-servers a la vez. → Patrón ideal para agregar.
- **Wrap/gestión: mcporter** (TS) — llama MCPs como API y puede `generate-cli`; útil para envolver
  o introspectar. Existe además como skill de gestión de MCP.
- **Registro en Claude Code:** `claude mcp add --scope user ego-toolbelt -- <cmd>` → se guarda en
  `~/.claude/settings.json`, disponible en todos los proyectos; transporte **stdio**.
  (`--scope project` escribiría `.mcp.json` del repo; aquí queremos **user**.)

> Verificar la firma exacta de `as_proxy`/`mount` en la doc de FastMCP 3 antes de codear (no asumir).

---

## 2. Inventario: qué es "no-adaptable" en cada repo

| Repo | Herramienta no-adaptable | Cómo entra al gateway |
|---|---|---|
| **mythos-agent** | Su **MCP propio** (`src/mcp/server.ts`) + CLI (`scan, taint, variants, fix, report, baseline, compare, doctor, sbom, threat-model, compliance, score, map, deps, check`) | **Proxy** del MCP de mythos bajo `sec.*`, con **whitelist defensivo** |
| **Multi-Agents-Debate** | `code/debate4tran.py` / `interactive.py` | `@tool debate.run(...)` (subprocess) |
| **RealMythos** | `stage3-repro-env` (validación reproducible, ~18% madurez) | `@tool validate.repro(...)` (opcional, degrada con gracia) |
| **ponytail** | `commands/*.toml` (review/audit/debt) — ya es **plugin** | Nativo como plugin; opcional `@tool ponytail.review` |
| **hermes-CCC** | Skills + `native-mcp`/`mcporter` (mecanismo) | No es tool; es el **método** de cableado |
| **turbovec** | Índice vectorial = **memoria (ADAPTABLE)** | **Fuera**: vive en `ego-memory` (§5 principal) |
| **SEAL** | Motor de auto-edición = **ADAPTABLE** | **Fuera**: §4 principal |

**Exclusión de seguridad (vinculante):** del CLI de mythos se exponen **solo** tools defensivos. Se
**excluyen** `hunt`, `pentest` y cualquier ruta de `exploit-agent`/`poc-generator`/fuzzer. El
whitelist se aplica en el proxy (no se confía en "no llamarlos").

---

## 3. Arquitectura objetivo

```
Claude Code  ──stdio──►  ego-toolbelt  (FastMCP 3 gateway)
                          ├── proxy  → mythos MCP      namespace sec.*   [whitelist defensivo]
                          ├── tool   → debate.run      (MAD)
                          ├── tool   → validate.repro  (RealMythos stage3, opcional)
                          └── tool   → ponytail.review (opcional)
Registro:  claude mcp add --scope user ego-toolbelt -- python -m ego_toolbelt
Skill:     skills/ego-toolbelt/SKILL.md  (cuándo/cómo + límite + routing)
```

Memoria (`ego-memory`/turbovec) y `ego-self-edit` (SEAL) son **servidores/skills aparte**; el
gateway no los absorbe (son la capa adaptable).

---

## 4. Fases

### Fase 0 — Sondeo (probe before build)
- Introspectar el **MCP real de mythos**: arrancarlo y listar `tools/` (con `mcporter` o un cliente
  FastMCP) para ver **nombres y esquemas reales** (no asumir). Anotar cuáles son defensivos.
- Confirmar entrypoints/flags de `debate4tran.py` y de `stage3-repro-env`.
- Verificar versiones: FastMCP 3.x, Python 3.12, Node ≥20, y que `mythos-agent` compila (`dist/`).
- **Salida:** tabla real `{tool, descripción, args, defensivo?}` + lista de exclusiones.

### Fase 1 — Esqueleto del gateway
- Paquete `ego_toolbelt/` con `mcp = FastMCP("ego-toolbelt")` y `if __name__: mcp.run()` (stdio).
- Smoke: arranca, `tools/list` vacío. Registrar user-scope y verlo en `claude mcp list` (verde).

### Fase 2 — Proxy de mythos (defensivo)
- `as_proxy` del MCP de mythos montado bajo `sec.*`.
- Aplicar **whitelist** vía filtrado/transform de tools de FastMCP: exponer solo el subset
  defensivo; **descartar** `hunt`/`pentest`/exploit. 
- Test: `sec.scan` y `sec.taint` responden; `hunt`/`pentest` **no** aparecen en `tools/list`.

### Fase 3 — MAD como tool
- `@mcp.tool debate.run(topic, affirmative, negative, rounds=3) -> verdict` envolviendo
  `debate4tran.py` por subprocess (timeout, captura de salida, parse de veredicto).
- Test contra un caso del repo; veredicto estructurado {ganador, razones, transcript}.

### Fase 4 — Validación RealMythos (opcional)
- `@mcp.tool validate.repro(finding) -> {reproduced: bool, evidence}` sobre `stage3-repro-env`.
- Madurez ~18%: si no reproduce, **degradar con gracia** (devuelve `unknown`, no falla el gateway).

### Fase 5 — Companion skill + routing
- `skills/ego-toolbelt/SKILL.md` (formato hermes, ≥100 líneas): purpose, activación, **tabla de
  tools**, límite §1.1, y cómo el **kernel del ego** enruta (`hermes-route` → elige tool).
- ponytail rige: **una** skill que indexa el gateway, no una por tool.

### Fase 6 — Empaquetado/endurecible (opcional)
- `MCPConfig` declarando los sub-servers; `mcporter generate-cli` para un CLI standalone del toolbelt.
- Secrets por `env` (no en config); subprocess de MAD/validation con timeout y cwd aislado.

### Fase 7 — Aceptación
1. `claude mcp list` → `ego-toolbelt` verde, user-scope.
2. `tools/list` muestra **solo** lo permitido; `hunt`/`pentest`/exploit **ausentes**.
3. `sec.scan`, `debate.run` y (si aplica) `validate.repro` funcionan end-to-end.
4. El **kernel del ego** invoca el gateway por la skill `ego-toolbelt`.
5. Reversible: quitar el server no rompe nada (`claude mcp remove`).

---

## 5. Riesgos y mitigaciones

- **Fuga ofensiva por el proxy** → whitelist forzado en Fase 2 + test que verifica ausencia de
  `hunt/pentest/exploit` en `tools/list`. No basta con "no llamarlos".
- **Deriva de versiones** (FastMCP 3 / mythos) → fijar versiones en `pyproject`/`package.json`; Fase 0 valida.
- **Subprocess inseguro** (MAD/validation) → timeout, cwd aislado, sin shell-injection (args list).
- **Solapamiento con memoria** → turbovec/SEAL **no** entran aquí; el gateway es solo herramientas fijas.
- **Sobre-construcción** → ponytail: un gateway + una skill; tools opcionales (4, ponytail.review) solo si se usan.

---

## 6. Decisiones abiertas
1. ¿`ponytail.review` como tool del gateway, o dejar ponytail solo como plugin nativo? (recomiendo nativo).
2. ¿`validate.repro` ahora (madurez 18%) o esperar a que stage3 madure? (recomiendo opcional/diferido).
3. ¿Lenguaje/objetivo de auditoría para afinar el subset defensivo de `sec.*`?
4. Confirmar Fase 0 contra el MCP real de mythos antes de codear Fase 2.
