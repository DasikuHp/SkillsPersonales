---
name: codebase-memory
description: Structural code-intelligence engine for the whole repo — a pure-C, zero-dependency static binary that builds a persistent knowledge graph (tree-sitter across 158 languages, Hybrid LSP semantic type resolution for 10 of them: Python, TS/JS/JSX/TSX, PHP, C#, Go, C, C++, Java, Kotlin, Rust) and answers structural queries in under 1ms via 14 MCP tools (search_graph, trace_path, query_graph Cypher subset, get_architecture, detect_changes, semantic_query, and more). Use when locating a symbol across a large repo ("where is X defined/called"), indexing a project for the first time, tracing a call chain, mapping a diff's blast radius, or getting an architecture overview — instead of grep/read cycles. The MCP server is already wired in .mcp.json; if the binary itself is missing, provision it first with /ensure-engine codebase-memory (comprobar-primero, official prebuilt by default).
version: 0.1.0
author: hugouchija44 (EGO OS wiring over the codebase-memory-mcp C engine; upstream DeusData, mirrored at DasikuHp/codebase-memory-mcp)
license: MIT
metadata:
  ego:
    tags: [Code-Intelligence, Knowledge-Graph, Indexing, MCP, Engine, Tree-sitter, Cypher]
    related_skills: [ego-codesight, ego-toolbelt, ego-memory]
    mcp_server: [codebase-memory]
    ensure_engine: codebase-memory
---

# codebase-memory — structural memory of the codebase

This is the ego's long-range memory for *structure*: not "what did we discuss" (that is `ego-memory`) but
"what does this repo actually contain, and how is it wired together." It is a real, external C engine —
`codebase-memory-mcp` — not a mock or a stub. It builds a persistent knowledge graph of the project (files,
packages, functions, classes, call chains, HTTP routes, cross-service links) and answers structural
questions in under a millisecond once indexed, instead of the agent doing dozens of grep/read cycles.

## What it actually is

`codebase-memory-mcp` is a single static binary (macOS/Linux/Windows, no Docker, no Python venv, no API
key) that ships **zero dependencies** and **no LLM inside it** — it is a structural analysis backend, not
an intelligence layer. The MCP client (this agent) is the query translator: the agent decides *what* to
ask, the engine answers *fast and precisely* from the graph. It parses **158 languages** through vendored
tree-sitter grammars compiled into the binary, and layers a **Hybrid LSP** pass on top — a lightweight C
implementation of language type-resolution algorithms structurally inspired by tsserver, pyright, gopls,
Roslyn, Eclipse JDT and rust-analyzer — for Python, TypeScript/JavaScript/JSX/TSX, PHP, C#, Go, C, C++,
Java, Kotlin, and Rust, so `CALLS`/`USAGE` edges reflect real type resolution, not just textual matching.
Indexing is RAM-first (LZ4-compressed read, in-memory SQLite, single dump at the end, memory released
after) — an average repo indexes in milliseconds, the Linux kernel (28M LOC, 75K files) in about 3 minutes.
The resulting graph persists to SQLite at `~/.cache/codebase-memory-mcp/` across restarts, and can be
committed as a compressed team-shared artifact (`.codebase-memory/graph.db.zst`, optional, so a teammate
who clones the repo skips the full reindex and only fills in their local diff).

## When to reach for it

- "Where is `X` defined / where is it called from" across a repo too big to grep-and-read comfortably.
- First contact with an unfamiliar repo: index it, then ask for `get_architecture` instead of opening
  twenty files.
- Tracing a call chain (`trace_path`, inbound or outbound, depth 1–5) before changing a shared function.
- "What breaks if I touch this" — `detect_changes` maps the current git diff to affected symbols with a
  risk classification (blast radius), before the edit lands.
- Dead-code sweeps, near-clone detection (`SIMILAR_TO` edges), or cross-service HTTP/gRPC/GraphQL/tRPC
  route ↔ call-site linking.
- Structural questions that are naturally a graph query — `query_graph` accepts a read-only openCypher
  subset (`MATCH (f:Function)-[:CALLS]->(g) WHERE f.name = 'main' RETURN g.name`).
- Conceptual/fuzzy lookups where you don't know the exact name — the engine's semantic search layer
  (documented as `semantic_query`: vector search over bundled Nomic `nomic-embed-code` embeddings, no API
  key, 11-signal combined scoring) is built for exactly that.

Do **not** reach for it for a one-off single-file read (`Read` is cheaper and doesn't need an index), and
do not re-index a project that is already indexed and auto-syncing — `list_projects` / `index_status`
first.

## Current wiring in this SO — honesty check

The MCP server entry already exists: `.mcp.json` registers `"codebase-memory"` running
`node .claude/mcp-launchers/codebase-memory.mjs`. That launcher is check-first: it looks for the binary at
`$CBM_BIN`, then `~/.claude/engines-build/codebase-memory/` (`codebase-memory-mcp.exe`, `bin/`,
`extracted/`), then on `PATH`. **As of now, none of those exist on this machine** — the binary has not been
downloaded or built yet. Provisioning is deliberately opt-in (invariant: comprobar-primero, §40); the
launcher will refuse to start and print exactly this, pointing at `/ensure-engine codebase-memory`. Do not
claim the engine is running until `locate()` actually confirms a binary — that would violate the honesty
invariant.

## Provisioning: `/ensure-engine codebase-memory`

Before starting this engine for the first time, run the check-first contract:

```
node .claude/ensure.mjs codebase-memory
```

- If a binary is already present (PATH or `~/.claude/engines-build/codebase-memory/`), this is a no-op —
  it just writes the sentinel and reports where it found it.
- If it is missing (the current state), `codebase-memory` is registered as **heavy**: the contract refuses
  to download anything without `--confirmed`. It prints what it would do and exits 3. Confirm with the
  user first (§40), then re-run:
  ```
  node .claude/ensure.mjs codebase-memory --confirmed
  ```
  This downloads the **official prebuilt Windows amd64 binary, release v0.8.1**, from
  `github.com/DeusData/codebase-memory-mcp/releases`, via `curl` + `tar`, into
  `~/.claude/engines-build/codebase-memory/`. This is the default path — no C toolchain needed.
- `--from-source` builds from the cloned repo instead (`C:/claude-SO/_work/codebase-memory-mcp`,
  `scripts/build.sh`) — requires a gcc/clang + zlib toolchain; `ensure.mjs` does not automate the compile
  step for this path, it tells you to run the build script manually and drop the resulting binary in the
  same `engines-build/codebase-memory/` directory.
- A successful install writes `~/.claude/engines-build/codebase-memory.installed` (version hash sentinel)
  so the next pass is idempotent. Reconnect the MCP client afterward (`/mcp` should list 14 tools).

The `/ensure-engine` command wraps this exact contract — invoke it by name rather than hand-rolling the
`node` call.

## The MCP tools it exposes

Per the engine's own docs, 14 MCP tools, grouped by purpose:

**Indexing**

| Tool | Use when |
|---|---|
| `index_repository` | First-time (or forced re-) index of a repo. Auto-sync keeps it fresh after. |
| `list_projects` | List every indexed project with node/edge counts. |
| `delete_project` | Drop a project and all its graph data. |
| `index_status` | Check whether a project is currently indexing. |

**Querying**

| Tool | Use when |
|---|---|
| `search_graph` | Structured search: label, regex name pattern, file pattern, min/max degree, paginated. |
| `trace_path` | BFS call-chain traversal, inbound/outbound/both, depth 1–5 (alias `trace_call_path`). |
| `detect_changes` | Map the current git diff to affected symbols + blast radius, risk-classified. |
| `query_graph` | Read-only openCypher-subset query — the escape hatch for anything structural. |
| `get_graph_schema` | Node/edge counts and relationship patterns per label — run this first on a new graph. |
| `get_code_snippet` | Read source for a function by qualified name (`<project>.<path_parts>.<name>`). |
| `get_architecture` | One-call codebase overview: languages, packages, routes, hotspots, clusters, ADRs. |
| `search_code` | Grep-like text search, but scoped to already-indexed project files. |
| `manage_adr` | CRUD for Architecture Decision Records, persisted in the graph. |
| `ingest_traces` | Feed runtime traces in to validate `HTTP_CALLS` edges against real behavior. |

Alongside the table above, the engine's Search feature set separately documents a **semantic search
capability, `semantic_query`** — vector search across the whole graph on bundled `nomic-embed-code`
embeddings (no API key, no Ollama, no Docker), combined with 11 structural signals (TF-IDF, RRI, API/Type/
Decorator signatures, AST profiles, data-flow, Halstead-lite, MinHash, module proximity, graph diffusion).
Confirm its exact call name against the live `tools/list` once the binary actually runs here — the docs
describe it in prose next to `search_graph`/`search_code` rather than inside the 14-tool table, so treat
the name as documented-but-not-yet-hand-verified on this machine until the first real session.

## Typical procedure

1. **Check-first.** `list_projects` — is this repo already indexed? If yes, skip straight to querying.
2. **Index once.** `index_repository(repo_path="<absolute path>")` (absolute path required). Large repos
   take minutes, not hours; the RAM-first pipeline releases memory afterward.
3. **Orient.** `get_architecture` before anything else on an unfamiliar repo — languages, packages, routes,
   hotspots, clusters in one call.
4. **Find it.** `search_graph(name_pattern=".*Handler.*", label="Function")` to get the exact qualified
   name before tracing or reading a snippet — `trace_path` and `get_code_snippet` both need the real name.
5. **Trace or query.** `trace_path` for "who calls this / what does this call"; `query_graph` (Cypher
   subset) for anything more structural than a name search.
6. **Before an edit lands.** `detect_changes` on the working diff to see the blast radius and risk class.
7. **Read the actual code** only for the specific qualified name the graph pointed at — `get_code_snippet`
   or `Read`, not a fresh grep of the whole tree.

## Decision rules

- Prefer the narrowest tool for the question — `search_graph` before `query_graph`, `get_code_snippet`
  before a full file `Read`, one project's graph before a cross-repo `CROSS_*` sweep (ponytail).
- Re-index only when `index_status`/`list_projects` says the project isn't tracked, or the watcher is
  known to be off (`auto_watch=false`) and files changed underneath it.
- `query_graph` is read-only by design (openCypher subset: no `MERGE`/`CALL`, no writes) — anything
  outside the supported clause set fails with a clear error rather than silently returning nothing; that
  is the engine being honest, not broken.
- If `trace_path` returns zero results, the name was probably wrong — run `search_graph` first to confirm
  the exact qualified name rather than assuming the function doesn't exist.

## Failure modes to avoid

- Claiming the engine is "running" or "indexed" without a tool call confirming it (`index_status`,
  `list_projects`) — that is exactly the kind of unverified claim invariant 2 forbids.
- Starting a full-repo `index_repository` when the question only concerned one file or one package.
- Treating `/ensure-engine codebase-memory`'s heavy-gate refusal as a bug — it is the check-first contract
  working as designed; get the user's go-ahead, then re-run with `--confirmed`.
- Fabricating a `search_graph`/`trace_path` result when the server is down — say the engine is unavailable
  and fall back to `Grep`/`Glob` manually instead.

## Integration with the loop

- `ego-codesight` and the `appsec-red`/`appsec-blue` agents can use this engine to locate the exact
  handler, route, or data-flow path before running a `sec.*` scan on it — narrower scans, ponytail-clean.
- `ego-memory` is the complementary layer: `codebase-memory` remembers *what the code is*, `ego-memory`
  remembers *what was learned about it*. Persist durable findings (a recurring dead-code cluster, a hot
  call path) to `ego-memory`, not by re-running the graph query every session.
- `ego-toolbelt` is a different kind of gateway (defensive `sec.*` tools); `codebase-memory` is its own
  direct MCP server, not proxied through the toolbelt.

## Troubleshooting

- `/mcp` doesn't show `codebase-memory`, or it shows red — the binary is almost certainly still missing;
  run `/ensure-engine codebase-memory` and read what it prints instead of guessing.
- `index_repository` fails — pass an absolute path (`repo_path="C:/absolute/path"`), not a relative one.
- `trace_path` returns 0 results — confirm the exact qualified name via `search_graph` first.
- Queries return results from the wrong project — pass `project="name"` explicitly (`list_projects` shows
  the registered names).
- Slow memory growth over a long session — the engine supports `CBM_DIAGNOSTICS=1` (writes an `.ndjson`
  memory trajectory to the temp dir); set it in the server's `env` block in `.mcp.json` before reproducing.

## Self-check

Did I confirm the engine is actually indexed/running before answering from it, rather than assuming? Did I
pick the narrowest tool for the question? Did I provision the binary only after the user's explicit
confirmation of the heavy download, never silently? If the server was down, did I say so plainly instead
of inventing a plausible-looking graph result?
