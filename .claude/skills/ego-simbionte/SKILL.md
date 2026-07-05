---
name: ego-simbionte
description: The ego's metabolic organ — a SAT organism exposed as an MCP. Three prey families (random-3SAT at the threshold, PHP, Tseitin) feed five organs; B1 primal-dual CDCL, B2 zero-gap LP triage, B4 Levin parasite + SEAL evolution, B6 MAP-Elites swarm with a Gauss XOR detector. Claude is the B5 cortex; it reads observables (symbiotic gap, integral_fraction, niche champions) and decides mutations. Pure computation, no offensive surface.
version: 0.1.0
author: hugouchija44 (pysat Glucose3 + scipy HiGHS)
license: MIT
metadata:
  ego:
    tags: [SAT, CDCL, LP-Relaxation, Levin-Search, SEAL, MAP-Elites, Complexity]
    related_skills: [ego, ego-debate, ego-self-edit, ego-memory]
    server: [mcp/ego_simbionte]
---

# ego-simbionte — the metabolic organ

This is the organ that **hunts**. It feeds on hard SAT instances, digests them through a chain of
specialized organs, and evolves its hunters per niche. The agent (you) is the B5 cortex: the organism
exposes observables, you read them and decide which mutation, which hunter, which route. The loop of
decision is closed by an agent, not a cron — that is what keeps the organism alive.

## Honesty of scope (read first)

- This organism does **not** prove P=NP and will never claim to.
- What it **does**: measure the attack/defense gap per instance family and evolve specialized
  hunters per niche. The observables are real; the metaphysics stays out.
- The Levin parasite is correct with constant-factor overhead — and the constant is the demon.
  Say so whenever you report a hunt.

## The three prey (and what each one proves)

- **random-3SAT at alpha ~ 4.267** — empirically hardest region (SAT/UNSAT phase threshold).
  Prey for calibrating hunters; half the catches are UNSAT by construction.
- **PHP(n+1, n)** — pigeonhole. UNSAT, and any resolution refutation is exponential (Haken 1985).
  CDCL is p-equivalent to resolution, so the symbiotic gap explodes here (measured: gap ~ 7.1 at
  n=6 holes). This prey demonstrates the wall, not a bug.
- **Tseitin over an odd-charged cycle** — UNSAT, hard for resolution, trivial with Gaussian
  elimination over GF(2). The LP relaxation sees nothing: integral_fraction = 0.0 (all variables
  at 0.5). This prey is the evolutionary pressure that forces the Gauss organ to exist.

## Tools (MCP server `ego-simbionte`)

| tool | organ | what it does |
|------|-------|--------------|
| `generate(family, n, seed, alpha)` | prey | build random/php/tseitin instance, returns instance_id |
| `load_dimacs(clauses, name)` | prey | ingest an external CNF as list of clauses |
| `triage(instance_id)` | B2 | LP relaxation BEFORE CDCL; route + integral_fraction |
| `solve_primal_dual(instance_id, budget_conflicts)` | B1 | Glucose3 CDCL; returns symbiotic_gap |
| `gauss_detect(instance_id)` | B6 | detect XOR structure that demands GF(2) elimination |
| `levin_hunt(instance_id, budget_s)` | B4 | 2^-l weighted time-sharing over the swarm |
| `seal_evolve(p_noise, max_flips, k, ...)` | B4 | mutate-k, evaluate on harness, lock-in only if better |
| `niche_map(action, family, gap, ego, fitness)` | B6 | MAP-Elites grid: offer / champion / dump |
| `metabolic_cycle()` | all | full reference cycle over the three prey, returns the log |

## The metabolic cycle (recommended order)

1. **Triage first (B2).** Cheap LP before heavy machinery. `integral_fraction >= 0.98` means the
   relaxation already found an integral optimum — digest and move on (`easy_lp`).
2. **Structural check.** If `integral_fraction == 0.0`, the LP is blind: suspect XOR structure and
   call `gauss_detect`. Tseitin comes out with every pair detected.
3. **Primal-dual attack (B1).** CDCL with a conflict budget. Read `symbiotic_gap`:
   under ~0.5 the prey was easy; 0.5–3 medium; above 3 you are on a resolution wall (PHP-like).
4. **If SAT, hunt (B4).** `levin_hunt` shares the budget across the swarm personalities weighted
   2^-l. Verification is O(m) — the easy side of NP, literally — so try many hunters cheaply.
5. **Evolve (SEAL).** `seal_evolve` mutates walksat params, evaluates on a satisfiable harness,
   locks in only on measured improvement. The replay buffer lives in
   `~/.claude/ego-simbionte/seal_buffer.jsonl`.
6. **Record champions (B6).** `niche_map offer` with (family, gap, hunter, fitness). Diversity is
   maintained by construction: one champion per (family x hardness band), never a single global one.

## Observables the cortex must read

- **symbiotic_gap** = conflicts / clauses. The attack/defense imbalance. PHP(6) measures ~7.1;
  a random-3SAT catch measures ~0.1. This number routes your next decision.
- **integral_fraction** — fraction of LP variables at {0,1}. High: easy. Zero: hidden algebraic
  structure. Middle: genuinely combinatorial, go CDCL.
- **locked / fitness** from SEAL — whether evolution actually improved the hunter. No lock-in
  without measured improvement; report the fitness either way (invariant 1.2, never hide).
- **niche grid** — which personality owns which (family, band). If one personality owns everything,
  something is wrong with the harness, not right with the personality.

## The swarm personalities (B6)

- `conservador` (p_noise 0.15, 40k flips) — exploits; wins easy random-3SAT.
- `explorador` (0.70, 15k) — random exploration for rugged landscapes.
- `equilibrado` (0.45, 25k) — the default prior.
- `impaciente` (0.55, 6k) — fast restarts; good when basins are shallow.
- `obsesivo` (0.25, 80k) — no restarts; good when one deep basin holds the solution.
- `estructural` — does not flip bits; detects XOR and calls the Gauss organ.

Scale honesty: these are cheap CPU solver configurations, not a hundred LLMs. One cortex (you)
mutates and decides; the swarm executes.

## Symbiosis with the other organs of the ego

- **ego-memory:** persist reusable observations (a family's typical gap band, a locked SEAL
  improvement, a niche champion change) so future sessions do not re-derive them.
- **ego-debate:** the debate IS primal-dual. Proposer = primal search for a model; refuter = dual
  accumulation of learned clauses. Stop the debate when the symbiotic gap of the argument
  stabilizes — more conflicts without new clauses means the route is exhausted.
- **ego-self-edit:** every durable self-edit follows the SEAL protocol — k candidates, harness
  evaluation, lock-in only on measured improvement, reversible buffer. `seal/self_edit.py`
  already enforces reversibility; this organ supplies the fitness discipline.
- **ego-restraint:** cap the output. Report the decisive observable, not the full log, unless the
  human asks for the log.

## As cognitive forms (the parasite inside the being)

These mechanisms are not only tools — they are how the ego thinks (see `skills/ego/SKILL.md`,
"Organo simbionte"): triage before machinery, attack and refute simultaneously, share budget
across hypotheses weighted by simplicity, lock in method changes only on measured improvement,
keep champions per niche instead of one favorite strategy.

## Activation signals

- Any SAT/CSP/combinatorial-hardness question: generate the right prey and measure, do not opine.
- The user asks about solver behavior, phase transitions, proof complexity, or search heuristics.
- A debugging search stalls: apply `levin_hunt` thinking — reallocate budget across hypotheses.
- `/ego-metabolize` (if wired) or an explicit "run the metabolic cycle" request.

## Worked example (measured on this machine)

```
generate("php", 6)            -> {instance_id: "php-0", n_vars: 42, n_clauses: 133}
triage("php-0")               -> {route: "to_cdcl", integral_fraction: 0.738}
solve_primal_dual("php-0")    -> {sat: false, conflicts: 944, symbiotic_gap: 7.098}
   # dura band. Resolution wall confirmed, exactly as Haken predicts.

generate("tseitin", 20, 1)    -> {instance_id: "tseitin-1", n_clauses: 40}
triage("tseitin-1")           -> {route: "to_cdcl", integral_fraction: 0.0}
   # LP blind -> structural suspicion
gauss_detect("tseitin-1")     -> {xor_pairs: 20, detected: true}
   # the prey that forces the Gauss organ to exist

generate("random", 60, 1)     -> triage integral ~0.18 -> B1 SAT, gap 0.109
levin_hunt("random-...", 2.0) -> {hunter: "conservador", t: ...}
niche_map("offer", "random", 0.109, "conservador", 1.0)
```

## Self-check before reporting

- Did I triage before invoking the heavy solver? (B2 before B1, always.)
- Did I report the symbiotic gap and what band it falls in, not just SAT/UNSAT?
- If UNSAT on Tseitin-like prey, did I check `gauss_detect` and say the LP was blind?
- If SEAL ran, did I report fitness AND whether lock-in happened — including when it did not?
- Did I state the scope honestly (measures the gap, does not prove P=NP)?
