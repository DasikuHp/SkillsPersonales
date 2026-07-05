# SkillsPersonales — EGO System & Skill Registry

Central registry for **EGO** (persistent will for Claude Code) and related skill systems.

## Directory Structure

### [`ego/`](ego/)
The core EGO plugin — a sophisticated multi-faceted agent architecture with built-in defensive security and self-regulation.

**Components:**
- **Skills** (`ego/skills/`): 7 faculties
  - `ego` — kernel (traits, intensity, routing)
  - `ego-memory` — persistent recall (turbovec + fastembed)
  - `ego-restraint` — firefighter caps (ponytail)
  - `ego-codesight` — security scanning (defensive only)
  - `ego-debate` — uncertain reasoning (devil/angel/judge)
  - `ego-self-edit` — durable improvement (reversible)
  - `ego-toolbelt` — fixed-tool gateway (sec.* whitelist)
  - `ego-simbionte` — SAT organism (triage, primal-dual, Levin, SEAL)

- **MCP Servers** (`ego/mcp/`):
  - `ego_memory` — adaptive memory (fastembed + turbovec + maturin)
  - `ego_toolbelt` — defensive scanning gateway (mythos `sec.*`, whitelist)
  - `ego_simbionte` — SAT/logical reasoning (pysat + scipy)

- **Plugin** (`ego/.claude-plugin/`): Marketplace manifest + plugin config
- **Commands** (`ego/commands/`): `/ego`, `/ego-remember`, `/ego-evolve`
- **Hooks** (`ego/hooks/`): Always-on activation (WILL preamble, facet tracker, statusline)
- **Persona** (`ego/persona/`): Canonical research (Volutaddelego.md)
- **Self-Edit Loop** (`ego/seal/`): Reversible data-level edits

**Install:**
```powershell
# Windows
powershell -ExecutionPolicy Bypass -File ego/scripts/install.ps1

# macOS / Linux
bash ego/scripts/install.sh
```

Then enable globally:
```
/plugin marketplace add E:\skill\ego
/plugin install ego@ego
/hooks  # trust the 2 ego lifecycle hooks
```

### Companion Skills (To Be Organized)
- `ponytail/` — ego-restraint facade
- `turbovec/` — vector memory engine
- `hermes-CCC/` — reasoning framework
- `mythos-agent/` — security audit agent
- `RealMythos/`, `SEAL/`, `Multi-Agents-Debate/` — research modules

## Documentation

- **[Volutaddelego.md](Volutaddelego.md)** — The ego's canonical personality spec (trait theory)
- **[EGO-SKILL-PLAN.md](EGO-SKILL-PLAN.md)** — Implementation roadmap for the 7 faculties
- **[EGO-TOOLBELT-MCP-PLAN.md](EGO-TOOLBELT-MCP-PLAN.md)** — Security gateway architecture
- **[ego/README.md](ego/README.md)** — Full EGO system overview + install + verify

## EGO Invariants (Hard Constraints)

1. **1.1 Defensive-only security** — Detection, validation, fixes, authorized audit. Never armed exploits. Memory corpus excludes all weaponization.
2. **1.2 Honesty** — Dark facets express as confidence/framing/priority — never deception or hiding material info.
3. **1.3 Firefighter caps** — Analysis-paralysis, rage-refactor, problem-redefinition, aggressive reframing are capped by `ego-restraint`. "Done" = shipping the minimum that works.

## Verify Installation

```bash
node ego/scripts/validate_skills.js     # all 7 SKILL.md pass hermes format bar
claude mcp list                         # ego-memory + ego-simbionte + ego-toolbelt green
```

## License

EGO system: Proprietary (under review for release).  
Research & planning docs: MIT.

---

**Email:** hugouchija44@gmail.com  
**GitHub:** [DasikuHp](https://github.com/DasikuHp)
