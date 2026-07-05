---
name: ego-self-edit
description: The ego's metabolism — a SEAL-style self-improvement loop at the DATA level (no weights, no finetuning, no GPU). It generates a self-edit to memory/skills/heuristics, stages it in git, evaluates it with ego-debate plus an objective check, and gates the merge by human perceptibility (visible to a human -> human review; invisible and off the causal chain -> auto-merge), then indexes accepted edits in ego-memory or reverts and logs. Use to turn a recurring finding, feedback, or failure into a durable improvement.
version: 0.1.0
author: hugouchija44 (loop shape from SEAL general-knowledge continual_self_edits.py, data-level only)
license: MIT
metadata:
  ego:
    tags: [Self-Edit, SEAL, Continual-Learning, Merge-Gate, Reversible]
    related_skills: [ego, ego-debate, ego-memory, ego-restraint, ego-simbionte]
    pattern_source: [SEAL/general-knowledge/src/continual/continual_self_edits.py]
    entrypoint: [seal/self_edit.py, commands/ego-evolve.toml]
---

# ego-self-edit — metabolism at the data level

SEAL's idea is: the system writes its own edits and keeps only what improves it. SEAL's machinery does
this by finetuning weights (LoRA) — that is **out of scope** here (user decision: no GPUs, no
finetuning). The ego takes only the **shape** of the loop and applies it to **data**: memory entries,
skill text, heuristics. Every edit is staged in git and reversible.

## Purpose

Turn a recurring finding, a piece of user feedback, or a repeated failure into a durable, reviewed,
reversible improvement — without ever touching model weights and without crossing the defensive or
honesty invariants.

## Activation signals

- A pattern recurs (the same finding/answer derived repeatedly) → encode it once.
- Explicit feedback on how the ego should work → persist it.
- A failure worth not repeating → record the lesson.
- `/ego-evolve <target>` triggers one cycle.

## The loop

1. **Trigger (explicit).** Never on every turn. A recurring task, finding, feedback, or failure.
2. **ponytail-gate.** *Does this self-edit need to exist?* If it adds nothing, do not create it. (This
   is `ego-restraint` applied to the loop itself.)
3. **Generate the self-edit.** A concrete diff + a justification + ONE runnable check (assert-style).
4. **Stage in git.** A branch or copy — always reversible. Nothing is applied in place yet.
5. **Evaluate.** Run `ego-debate` (devil/angel/judge) on the edit AND an objective check (e.g. re-run a
   held-out case, or `sec.mythos_scan` before/after for a security heuristic).
6. **Merge gate — by human perceptibility (the user's rule):**
   - Does the change alter anything a human can **see, touch, hear, or feel**? → **Yes: wait for human
     review. No: continue.**
   - Is it on the direct causal chain toward something a human perceives? → **Yes: review. No:
     auto-merge.**
   - Auto-merge **only** if invisible AND off the causal chain — always with an easy `git revert`.
7. **Keep or discard.** Accept → merge + index the edit in `ego-memory` global (so it is recalled
   later). Reject → `git revert` + log the failure (so it is not retried blindly).
8. **Continual.** turbovec indexes accepted self-edits for later retrieval — the memory of how the ego
   improved itself.

## SEAL fitness discipline (simbionte mapping)

`ego-simbionte`'s SEAL organ makes the loop's evaluation step concrete and measurable, and its rules
apply to every self-edit here:

- **k candidates, not one.** When the edit has tunable form (a heuristic threshold, a phrasing, a
  rule's scope), generate a few mutated variants and evaluate all — do not polish a single favorite.
- **Lock-in only on measured improvement.** The runnable check of step 3 is the harness; if the
  candidate does not beat the baseline on it, the baseline stays. Enthusiasm is not fitness.
- **Record either way (1.2).** The simbionte appends every evolve attempt — locked or not — to its
  replay buffer (`~/.claude/ego-simbionte/seal_buffer.jsonl`). Do the same here: a rejected edit is
  logged with its measured fitness, so it is not retried blindly (step 7 already demands this).
- **Niche, don't crown.** An edit that improves one context may regress another — evaluate per niche
  (MAP-Elites thinking) before promoting a change to global memory.

## The merge gate, stated plainly

| Change | Visible to a human? | On causal chain to perception? | Decision |
|---|---|---|---|
| Internal heuristic weight, log format | no | no | auto-merge (reversible) |
| A memory entry that will shape future answers | no | yes (it feeds output) | human review |
| Skill text the user reads, any user-facing string | yes | yes | human review |

When in doubt, treat it as perceptible and ask for review. The gate is conservative by design.

## Output contract

```
{
  "target": "<what was edited>",
  "diff": "<the staged change>",
  "check": "<the one runnable assert>",
  "debate": { "winner": "...", "reasons": [...] },
  "perceptible": true | false,
  "on_causal_chain": true | false,
  "decision": "auto-merged" | "awaiting-review" | "reverted",
  "revert": "git revert <sha>",
  "indexed_id": "<ego-memory id if accepted>"
}
```

## Invariants on the loop

- **1.1:** a self-edit may only improve **defensive** capability — never add offensive capability.
- **1.2:** the loop never edits the ego toward hiding information or deceiving the user.
- **1.3:** the loop is bounded — no endless self-rewriting (rage-refactor cap). One cycle per trigger.

## Decision rules

- No edit without a justification and a runnable check (step 3 is mandatory).
- A debate `winner=angel` kills the edit before the gate.
- Anything user-facing is perceptible → review, never auto-merge.

## Failure modes to avoid

- Auto-merging a perceptible change because it "seemed small" — the gate is unconditional.
- Editing in place without git staging (loses reversibility).
- Self-editing on every turn (firefighter/over-engineering) instead of on explicit triggers.
- Drift/poisoning: an unreviewed edit shaping future answers — that is why memory edits get review.

## What gets self-edited (the data surface)

The loop edits **data**, never weights:

- **Memory entries** — promoting/refining a heuristic stored in `ego-memory` (perceptible: it shapes
  future answers → review).
- **Skill text** — tightening a decision rule in a `SKILL.md` (perceptible: the user may read it →
  review).
- **Heuristics/config** — an internal threshold, a log format, a classifier keyword list (often
  invisible → may auto-merge).

If a proposed "edit" would require changing model weights, it is out of scope — reframe it as a data or
prompt change, or drop it.

## Why the perceptibility gate (not an accuracy gate)

A pure accuracy gate ("merge if the check passes") drifts: a string of locally-correct edits can still
move the ego somewhere the user never sanctioned. The user's rule ties merges to **human perception** —
anything a human could see/touch/hear/feel, or that feeds toward it, waits for review. This keeps the
human in the loop exactly where it matters and lets only truly invisible plumbing auto-merge.

## Worked example (auto-merge path)

Trigger: the facet classifier mislabels "audit this contract" as `self` instead of `paranoia`.
1. ponytail-gate: worth fixing — recurring misclassification. Proceed.
2. Generate: add `"contract"`-adjacent security keywords to the `paranoia` list in `ego-facets.js`.
3. Stage on a branch.
4. Debate: angel checks for over-broad matching; judge: winner=devil, narrow addition is safe.
5. Gate: the classifier output feeds the statusline badge — a human SEES the badge → **perceptible →
   review**. (Even this small change waits, because it is visible.)

## Worked example (review-required path)

Trigger: a CWE-89 detection heuristic should remember a project-specific sink.
1. ponytail-gate: yes, recurring.
2. Generate: a memory entry, not code.
3. Stage / record.
4. Debate passes.
5. Gate: a memory entry shapes future answers → on the causal chain → **review**. Index only after the
   user approves.

Most real edits land on the review path — which is the conservative, intended behavior.

## Logging and reversibility

- Every cycle appends to a log: trigger, diff, debate verdict, decision, and the `git revert` command.
- Accepted edits carry their `sha` in the indexed memory meta (`kind:"self-edit"`), so the ego can later
  recall *how* it changed and undo it.
- Nothing is irreversible: a bad auto-merge is one `git revert` away, and it is logged.

## Anti-patterns

- Treating the loop as continuous learning that runs every turn — it is trigger-driven, one cycle each.
- Auto-merging anything user-facing because the diff was small.
- Generating an edit without the mandatory one runnable check.
- Letting rejected edits vanish without a logged reason (they will be re-proposed blindly).

## Self-check

Did this edit need to exist (ponytail)? Is it staged and reversible? Did it survive debate + an
objective check? Was the perceptibility gate applied honestly (when in doubt, review)? If accepted, was
it indexed; if rejected, was it reverted and logged? If yes, the metabolism ran clean.
