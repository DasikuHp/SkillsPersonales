---
description: Read or set the current EGO dominant facet (researcher/coder/analyst/advisor)
argument-hint: "[facet]"
allowed-tools: [Read, Write, Bash]
---

Read or force the EGO dominant facet expression. Runtime state lives in ~/.claude/.ego-facet.

If $ARGUMENTS is empty, display the current facet.
If $ARGUMENTS contains a facet name, set it (must be: researcher, coder, analyst, advisor).

Valid facets express the dominant mode; they are expressions, not separate identities. The underlying being and honesty invariant 1.2 remain constant.

**Implementation:**

1. Parse $ARGUMENTS (trim whitespace)
2. If empty: Read ~/.claude/.ego-facet and display current facet
3. If provided: Validate against valid facets [researcher, coder, analyst, advisor]
   - If valid: Write to ~/.claude/.ego-facet
   - If invalid: Display error and list valid options
4. State persists; runtime EGO checks this file at session start
