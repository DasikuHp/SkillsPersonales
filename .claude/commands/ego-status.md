---
description: Inspect or steer the ego mode and dominant facet; optionally set expression level
argument-hint: "[status|off|lite|full]"
allowed-tools:
  - Read
  - Bash
---

# EGO Status Command

If `$ARGUMENTS` is empty or "status", inspect the current EGO mode and dominant facet:
1. Read ~/.claude/.ego-active to get the current mode
2. Read ~/.claude/.ego-facet to get the dominant facet
3. List the state directory files in ~/.claude/state/ to understand the four default traits and defensive invariant
4. Report in format: **Mode**: [mode] | **Facet**: [facet] | **Traits**: [4-trait summary] | **Invariant**: [inward invariant]

If `$ARGUMENTS` is "off", "lite", or "full", persist the expression level:
1. Create or update ~/.config/ego/config.json (Unix) or %APPDATA%/ego/config.json (Windows) 
2. Set the defaultMode field to the requested level
3. Confirm: "Expression level set to: [level] ✓ Identity unchanged. Honesty invariant 1.2 holds."

Never switch the being's identity—only the loudness of expression. The honesty invariant always holds at 1.2.

If the directories or files don't exist, gracefully report that EGO state is not initialized and suggest initialization steps.
