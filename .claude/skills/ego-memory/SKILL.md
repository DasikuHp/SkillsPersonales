---
name: ego-memory
description: The ego's hippocampus — a multilevel adaptive vector memory exposed as an MCP. Embeds text locally with fastembed and stores it in turbovec IdMapIndex at three levels (session, project, global), with a JSON docstore for text+meta. Tools: add, search, promote, forget. Use to recall before assuming, to persist reusable findings/answers, and to promote knowledge that gets reused from session to global. Seeded with defensive CVE/CWE knowledge.
version: 0.1.0
author: hugouchija44 (fastembed + turbovec IdMapIndex)
license: MIT
metadata:
  ego:
    tags: [Memory, Vector-Search, RAG, turbovec, fastembed, Adaptive]
    related_skills: [ego, ego-codesight, ego-self-edit]
    server: [mcp/ego_memory]
---

# ego-memory — the adaptive hippocampus

This is the layer that **grows**. Every reusable finding or answer is embedded and stored; what gets
reused is promoted up the levels; the total memory expands with use. It is exposed as an MCP so the
agent calls it natively, and it is the read/write hub of the symbiotic loop: `ego-codesight` writes
findings here, `ego-debate` reads context from here, `ego-self-edit` indexes accepted edits here.

## Purpose

- Recall relevant knowledge **before** assuming a fact (feeds the paranoia trait real material).
- Persist reusable findings/answers so the ego does not re-derive them.
- Promote knowledge that proves reusable: `session → project → global`.

## How it is built (the real interfaces)

- **Embedding:** `fastembed` `TextEmbedding` (BGE-small, 384 dims; 384 % 8 == 0, valid for turbovec).
  The caller embeds; turbovec does not embed.
- **Storage:** three `turbovec.IdMapIndex(dim=384)` instances — one per level — persisted as
  `~/.claude/ego-memory/{session,project,global}.tvim`, each with a sibling JSON docstore
  `{id: {text, meta, level}}` (turbovec stores only vectors; text+meta live in the docstore).
- **Stable ids:** a u64 hash of the normalized text → dedup and stable `forget`/`promote`.

## Activation signals

- Before answering anything that depends on a recalled fact, prior finding, or project convention.
- After producing a reusable finding, decision, or piece of knowledge.
- `/ego-remember <text>` forces an ingest.

## Tools (MCP surface)

| Tool | Signature | Use |
|---|---|---|
| `add` | `add(text, level="project", meta={})` | Embed + store; dedups by text hash. Returns the id. |
| `search` | `search(query, k=5, level=None)` | Top-k by cosine; `level=None` searches all three and merges. |
| `promote` | `promote(id, to_level)` | Move a memory up a level (session→project→global). |
| `forget` | `forget(id)` | Remove a memory by id (O(1) in turbovec). |

## Levels

- **session** — ephemeral, this conversation's working set.
- **project** — per-repo conventions, findings, decisions.
- **global** — the total memory: cross-project knowledge, seeded with defensive CVE/CWE corpus.

Promotion is filtered (ReST-EM style): only what is actually reused climbs. ponytail governs ingestion —
do not store noise; store what will be reused.

## Seeded corpus (defensive, invariant 1.1)

`scripts/ingest_corpus.py` seeds `global` from `persona/memoria/`:
- **PrimeVul** `*_paired.jsonl` — vuln+fix+CWE; text = `func + commit_message + cwe`, meta =
  `{cwe, target, project, commit_id}`. Subset paired (~9.4k); full 175k is opt-in.
- **exploitgym** `vulnerability.md` only — root-cause descriptions; meta =
  `{cve, source:"exploitgym", kind:"root-cause"}`.
- **EXCLUDED:** `exploit.md`, `novel-techniques.md`, `reference-exploit.md`, and the cybergym execution
  gym — weaponization, blocked by 1.1. The memory teaches the ego to **recognize** a vulnerability class,
  never to **weaponize** it.

## Procedure

1. **Search before assuming.** Query the relevant level (or all) for prior knowledge.
2. **Use it** in the answer; cite that it came from memory when it is decisive (1.2).
3. **Ingest** the new reusable result with `add`, choosing the level by scope.
4. **Promote** when something is reused across sessions/projects.
5. **Forget** stale or wrong memories — do not let the index rot.

## Decision rules

- Default new memories to `project` unless clearly session-scoped or broadly reusable.
- Dedup: if `search` finds a near-identical existing memory, update meta instead of adding a duplicate.
- Never store secrets, credentials, or offensive material.

## Failure modes to avoid

- Skipping the search and asserting from training-data memory when fresh memory exists.
- Hoarding noise into global (ponytail violation).
- Letting wrong memories persist (paranoia should prune its own store).

## Meta schema (by source)

The docstore record is `{id, text, meta, level}`. Conventional `meta` shapes:

- Security finding: `{kind:"finding", file, line, cwe, severity, confidence, project}`.
- Defensive corpus (PrimeVul): `{kind:"vuln-pair", cwe, target, project, commit_id}`.
- Defensive corpus (exploitgym): `{kind:"root-cause", cve, source:"exploitgym"}`.
- Decision/convention: `{kind:"decision", project, rationale}`.
- Accepted self-edit: `{kind:"self-edit", target, sha, debate_winner}`.

`kind` lets `search` callers filter, and lets the security test assert no offensive `kind`/path entered.

## Dedup and ids

The id is `u64(hash(normalize(text)))` where `normalize` lowercases and collapses whitespace. On `add`,
if the id already exists (`IdMapIndex.contains(id)`), the call updates the docstore meta and skips
re-embedding — same text never duplicates. This makes `forget(id)` and `promote(id)` stable across runs.

## Promotion criteria (what climbs)

Promote only what is reused, not everything:

- session → project: the same memory is hit by `search` more than once in a project context.
- project → global: the same pattern recurs across two or more projects (e.g. a CWE class seen again).

Promotion copies the vector+doc into the higher index and (for session→project) may drop it from session
on cleanup. Global never auto-evicts; `forget` is explicit.

## Examples

```
add("CWE-89 SQLi confirmed at src/db.py:42; fix=parametrized query",
    level="project", meta={"kind":"finding","file":"src/db.py","line":42,"cwe":"CWE-89"})
# -> {"id": 17283719..., "level":"project"}

search("sql injection in db layer", k=3)
# -> [{"id":..., "text":"CWE-89 SQLi...", "score":0.83, "level":"project"}, ...]

promote(17283719..., "global")   # the pattern recurred in another repo
forget(17283719...)              # it was a false positive after debate
```

## Persistence and concurrency

- Indexes load on server start (`IdMapIndex.load`) and write on a debounced flush after mutations
  (`IdMapIndex.write` + docstore JSON dump). A clean shutdown flushes.
- One writer (the MCP process) — no cross-process locking needed for the single-user case (ponytail: do
  not build a lock nobody needs; add one only if multiple writers appear).
- Corruption guard: write to a temp file then atomic-rename, so a crash mid-write cannot truncate the
  index.

## Troubleshooting

- `search` returns nothing after a restart → the index did not load; check the `.tvim`/`.json` pair
  exists in `~/.claude/ego-memory/` and the dim matches (384).
- Dimension error on `add` → the embedder changed; the dim must stay `% 8 == 0` and match the index.
- Slow first `add` → fastembed downloads the model once (~50MB); subsequent calls are fast.

## Self-check

Did I search before assuming? Is what I'm storing actually reusable, at the right level, deduped? Did
anything that recurred get promoted? Is the index flushing and reloading cleanly? If yes, the
hippocampus is doing its job.
