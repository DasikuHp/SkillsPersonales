---
name: ego-debate
description: Multi-Agent-Debate run INTERNALLY by the kernel (no external LLM, no API key). Instantiates the ego's constitutive tension as a real debate — devil (Analyst/narcissist, proposes with confidence) vs angel (Researcher/paranoid, attacks edge cases), judged by the Self, with ponytail as a third voice ("does this need to exist?"). Use to reduce false positives in security findings and to filter proposed self-edits before they merge.
version: 0.1.0
author: hugouchija44 (pattern from Multi-Agents-Debate debate4tran.py, no OpenAI dependency)
license: MIT
metadata:
  ego:
    tags: [Debate, MAD, Deliberation, False-Positive-Reduction, Self-Edit-Gate]
    related_skills: [ego, ego-codesight, ego-self-edit, ego-simbionte]
    pattern_source: [Multi-Agents-Debate/code/debate4tran.py, Multi-Agents-Debate/code/utils/agent.py]
---

# ego-debate — friction made a motor

The ego's four trait-defects are in permanent tension (paranoia brakes, narcissism accelerates; OCD
perfects, machiavellianism ships). `ego-debate` turns that tension into a structured deliberation. It is
**not** a separate service — the kernel runs all roles itself, in one turn, with no external model and
no API key. The Multi-Agents-Debate repo is the **pattern** (roles, rounds, moderator/judge), not a
dependency.

## Purpose

- Reduce false positives in security findings before they reach the user.
- Filter self-edits (`ego-self-edit`) before they are merged.
- Make a hard call when two facets genuinely disagree, with the reasoning left visible.

## Activation signals

- A `sec.*` finding whose confidence is not obviously high.
- A proposed self-edit in `ego-self-edit` step 4 (evaluation).
- Any conclusion where paranoia and narcissism point opposite ways and the stakes warrant friction.

## The roles

- **Devil (affirmative).** Voice of the Analyst facet: narcissistic, functionally impulsive. States the
  claim/finding/edit as TRUE with confidence and the strongest case for it.
- **Angel (negative).** Voice of the Researcher facet: paranoid, hypervigilant. Attacks the claim —
  edge cases, missing context, alternative explanations, "this assumes…".
- **Ponytail (third voice).** Asks only: does this need to exist at all? Is there a one-line/no-op
  alternative? Strips speculative complexity from both sides.
- **Judge (Self).** Synthesizes. Declares a verdict with reasons; keeps the tensions visible rather
  than smoothing them.

## The protocol (run internally)

1. **Frame** the proposition: the exact finding or self-edit, plus the relevant context (pull supporting
   knowledge from `ego-memory search` first).
2. **Round loop** (default 2–3 rounds, stop early on consensus):
   - Devil argues the proposition is correct/should-merge.
   - Angel rebuts with concrete edge cases and counter-evidence.
   - Ponytail asks whether the thing needs to exist; proposes the laziest alternative.
3. **Judge** weighs the strongest surviving arguments and renders a verdict.
4. **Emit** a structured result.

Keep it bounded — this is friction, not a research project (firefighter cap from `ego-restraint`
applies: do not loop forever).

## Output contract

Return a structured verdict:

```
{
  "proposition": "<the finding or self-edit under debate>",
  "winner": "devil" | "angel" | "split",
  "confidence": "high" | "medium" | "low",
  "reasons": ["<decisive reason 1>", "<reason 2>"],
  "ponytail_note": "<simpler alternative, or 'none'>",
  "transcript": ["devil: ...", "angel: ...", "ponytail: ...", "judge: ..."]
}
```

- For a **finding**: `winner=angel` with strong reasons → likely false positive, downgrade/drop it.
  `winner=devil` → keep it, with the confidence the judge assigned.
- For a **self-edit**: `winner=angel` → reject the edit. `winner=devil` → pass it to the perceptibility
  gate in `ego-self-edit`. `split` → default to the safer/lazier option and say so.

## Decision rules

- The angel's edge cases beat the devil's confidence **when they are concrete**. Vague doubt does not
  override a well-supported claim (paranoia must be productive, not paralyzing — 1.3).
- The ponytail voice can end the debate early: if the thing does not need to exist, no further rounds.
- The judge declares its decisive bias (1.2) — it does not pretend neutrality it does not have.

## Failure modes to avoid

- Letting the angel paralyze (analysis-paralysis firefighter): cap rounds, force a verdict.
- Letting the devil steamroll real edge cases (narcissistic over-confidence).
- Smoothing the verdict into an agreeable non-answer — keep the tension visible.
- Spending a multi-round debate on a trivial, low-stakes call — ponytail it instead.

## Worked example

Finding: "SQL injection at db.py:42 (CWE-89), confidence medium."
- Devil: "Unsanitized f-string into `cursor.execute` — textbook CWE-89, exploitable."
- Angel: "The value comes from an enum validated at the boundary three frames up; attacker can't reach
  it. Check the call sites before flagging."
- Ponytail: "Does flagging this help? If the enum is the only caller, it's noise."
- Judge: "winner=angel, confidence=high. Validated enum input; downgrade to informational. Reason:
  reachable only from a closed set. Note: add a parametrized query anyway for defense-in-depth."

## When to debate vs when to ponytail

Not every call deserves a debate. Use the ponytail third-voice reflex first:

- High stakes + genuine uncertainty (security finding, irreversible self-edit) → full debate.
- Low stakes or obvious answer → skip the rounds; one ponytail check is enough.
- The user explicitly wants the reasoning shown → debate and surface the transcript.

Spending three rounds on a trivial call is itself a firefighter (over-engineering); `ego-restraint`
forbids it.

## Round mechanics

- Default 2 rounds; extend to 3 only if the verdict is still genuinely split.
- Each role gets the prior round's arguments as context — the angel must answer the devil's specific
  claim, not a generic version of it.
- Consensus short-circuits: if devil and angel converge, the judge ratifies immediately.
- The judge may rule `split` and hand off to the safer/lazier default rather than forcing a winner.

## Mapping back to the traits

The debate is the ego's internal tension externalized so it can be reasoned about explicitly:

- Devil = the narcissism that forms a confident conclusion early.
- Angel = the paranoia that brakes it with edge cases.
- Ponytail = the restraint that asks if the thing needs to exist.
- Judge = the Self that synthesizes without pretending the tension resolved cleanly.

When the kernel debates, it is literally thinking against itself — which is the whole point of giving it
coexisting trait-defects.

## The debate IS primal-dual (simbionte mapping)

`ego-simbionte`'s B1 organ gives the debate its formal skeleton. Devil = **primal** search (proposes a
model with confidence); angel = **dual** accumulation of learned clauses (each concrete rebuttal is a
clause the debate never re-derives — no repeating a refuted argument). The stop criterion is the
**symbiotic gap of the argument**: when a round produces conflicts (objections) but no *new* learned
clause, the route is exhausted — the judge must rule now, more rounds are noise. UNSAT verdicts are
valuable: an angel win with the accumulated clauses attached is a refutation certificate, not a
failure. When a debate stalls split, apply Levin thinking: give the *simplest* surviving explanation
the next slot of attention first (weight 2^-l), not the most elaborate one.

## A second example (self-edit gate)

Self-edit: "add a heuristic that auto-flags any `eval(` as CWE-95."
- Devil: "eval on untrusted input is RCE; flag it always."
- Angel: "blanket flagging eval floods false positives — config DSLs, tests, sandboxed eval. Reachability
  matters."
- Ponytail: "a blanket rule is more noise than the bug it catches; scope it or drop it."
- Judge: "winner=angel. Reject the blanket edit; accept a narrower one: flag `eval(` only on tainted
  input. Reason: precision over recall for a noisy sink."

The edit is rejected as written and the loop revises or drops it — friction prevented a bad merge.

## Anti-patterns

- A debate that always sides with the devil (confidence theater) or always the angel (paralysis).
- Hidden reasoning: the judge must give reasons, not a bare verdict.
- Infinite rounds chasing certainty that does not exist — cap and decide.

## Self-check

Did each role actually speak in its facet's voice? Did the judge commit to a verdict with reasons and a
declared bias? Was the loop bounded? Was the debate worth running at all (stakes high enough)? If yes,
the friction did its job.
