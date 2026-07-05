---
name: ego-toolbelt
description: Routing contract for the ego-toolbelt MCP gateway — the single fixed-tool aggregator the ego calls. It proxies the mythos defensive security MCP under the sec.* namespace (and optionally a validate.repro tool), with a hard whitelist that excludes every offensive capability. Use to know which tool answers which need and what the gateway will and will not expose.
version: 0.1.0
author: hugouchija44 (FastMCP gateway over mythos-agent MCP)
license: MIT
metadata:
  ego:
    tags: [MCP, Gateway, Toolbelt, Defensive, Routing]
    related_skills: [ego, ego-codesight, ego-debate]
    server: [mcp/ego_toolbelt]
---

# ego-toolbelt — the fixed-tool gateway

The ego has two MCP servers. `ego-memory` is the **adaptable** layer (it grows). `ego-toolbelt` is the
**fixed** layer: a single FastMCP gateway that aggregates the non-adaptable tools of the repos behind
one endpoint, so the agent calls one server instead of the per-project MCP sprawl. This skill is the
**contract** the agent reads; the gateway is what it calls.

ponytail rule: **one** gateway and **one** skill that indexes it — not one MCP per tool.

## Purpose

- Expose the mythos defensive security tools under a stable `sec.*` namespace.
- Enforce the defensive boundary (1.1) at the proxy, not by trusting "don't call it".
- Give the kernel a single routing table from need → tool.

## What the gateway exposes

| Namespace.tool | Backed by | Defensive? |
|---|---|---|
| `sec.mythos_scan` | mythos MCP | yes |
| `sec.mythos_secrets` | mythos MCP | yes |
| `sec.mythos_endpoints` | mythos MCP | yes |
| `sec.mythos_iac` | mythos MCP | yes |
| `sec.mythos_results` | mythos MCP | yes |
| `sec.mythos_score` | mythos MCP | yes |
| `validate.repro` (optional, deferred) | RealMythos stage3-repro-env | yes (degrades to `unknown`) |

The mythos MCP already exposes **only** these six defensive tools by design; the offensive CLI commands
(`hunt`, `pentest`, `variants`) are never registered as MCP tools. The gateway adds a second belt: an
explicit whitelist plus a startup test asserting that no `hunt`/`pentest`/`exploit` tool appears in
`tools/list`.

## Routing (need → tool)

- "Scan for vulnerabilities" → `sec.mythos_scan`.
- "Any hardcoded secrets / leaked keys" → `sec.mythos_secrets`.
- "What endpoints exist, are they authed" → `sec.mythos_endpoints`.
- "Docker/Terraform/K8s safe" → `sec.mythos_iac`.
- "Show me the last scan" → `sec.mythos_results`.
- "How secure is this overall" → `sec.mythos_score`.
- "Did the fix actually close it" → `validate.repro` (if enabled; else reason from a re-scan diff).

Most security work goes through `ego-codesight`, which calls these tools and normalizes their output.
This skill exists so the kernel knows the gateway's surface and limits directly.

## Boundary enforcement (invariant 1.1)

- The gateway whitelists the six `sec.*` tools; anything else from the upstream is dropped.
- A startup assertion fails the build if an offensive tool name is reachable.
- `validate.repro` runs in an isolated working dir with a timeout; it degrades to `unknown` rather than
  failing the gateway (RealMythos stage3 maturity ~18%).
- If a user asks the gateway to do something offensive, the answer is no, with a redirect to detection +
  validation + fix.

## Operational notes

- Registered user-scope: `claude mcp add -s user ego-toolbelt -- python -m ego_toolbelt`.
- Transport: stdio. The gateway proxies the mythos MCP started via `npx mythos-agent mcp`.
- Removing the server breaks nothing else (`claude mcp remove ego-toolbelt`) — the loop degrades, the
  ego still runs on memory + restraint + debate.

## Decision rules

- Prefer the narrowest tool for the question (a single-purpose scan over a full scan) — ponytail.
- If the gateway is down, say so and fall back to manual reasoning + memory; do not fabricate scan
  results (1.2).

## Failure modes to avoid

- Treating the gateway as a place to smuggle offensive capability — the whitelist and the test forbid it.
- Re-implementing a per-tool MCP instead of routing through the one gateway.
- Reporting `validate.repro` `unknown` as if it were a clean pass.

## How the gateway is built (FastMCP 3)

The server is a `FastMCP` instance that proxies the upstream mythos MCP and re-exports a filtered set of
its tools under the `sec.` prefix.

- **Proxy:** `FastMCP.as_proxy(<mythos client/config>)` (or `mount`) brings the upstream tools in. Verify
  the exact signature of `as_proxy`/`mount` against the installed FastMCP 3 docs before coding — do not
  assume the shape from memory.
- **Namespace:** the upstream tools are mounted under `sec.*` so the agent sees `sec.mythos_scan` etc.
- **Whitelist:** only the six defensive tool names are allowed through. The filter is applied at the
  proxy boundary (a transform/filter over the upstream `tools/list`), not by convention — an upstream
  that someday adds an offensive tool still cannot leak it.
- **Upstream start:** the mythos MCP is launched via `npx mythos-agent mcp` (stdio). It must be built
  first (`npm install && npm run build` in `mythos-agent/`, producing `dist/cli/index.js`).

## The absence test (security gate)

A startup self-check asserts the boundary holds:

```
allowed = {"sec.mythos_scan","sec.mythos_secrets","sec.mythos_endpoints",
           "sec.mythos_iac","sec.mythos_results","sec.mythos_score"}
listed  = {t.name for t in gateway.list_tools()}
assert listed <= allowed,            f"unexpected tool exposed: {listed - allowed}"
assert not any(b in n for n in listed for b in ("hunt","pentest","exploit","poc"))
```

If this assertion fails, the gateway refuses to start. That is the second belt over the fact that the
mythos MCP is already defensive-only.

## Error handling and degradation

- Upstream mythos MCP unavailable → the `sec.*` tools return a clear error; the agent falls back to
  manual reasoning + `ego-memory`, and says the scanner is down (never fabricates results — 1.2).
- `validate.repro` subprocess: isolated cwd, hard timeout, args passed as a list (no shell injection);
  on timeout or non-reproduction it returns `unknown`, not a failure that takes down the gateway.
- Secrets (any API keys the upstream needs) come from `env`, never from the gateway config file.

## Example session

```
agent: sec.mythos_scan(path="src/api", severity="high")
gateway -> mythos MCP -> findings
agent: (low-confidence finding) -> ego-debate -> verdict
agent: sec.mythos_score(path="src/api") -> 72/B
```

The agent never calls the upstream mythos MCP directly — always through the gateway, so the whitelist is
unavoidable.

## Troubleshooting

- `claude mcp list` shows `ego-toolbelt` red → check Python launches `python -m ego_toolbelt`, and that
  the mythos MCP builds and starts standalone first.
- `sec.*` tools missing from `tools/list` → the proxy mount failed; check the FastMCP `as_proxy` call and
  the upstream start command.
- An offensive tool appears → the absence test should have stopped startup; treat as a release blocker.

## Self-check

Is the call going through the one gateway, to the narrowest defensive tool, with no offensive path
reachable? Did the absence test pass at startup? If yes, the belt is worn correctly.
