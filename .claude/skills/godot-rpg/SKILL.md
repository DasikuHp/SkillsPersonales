---
name: godot-rpg
description: Use when building or editing a 3D RPG in Godot 4.x — character controllers, combat/AI state machines, quest and dialogue systems, inventories, save/load, NPC navigation — and when validating any .gd edit against the real Godot binary before moving on. Wires to the Godot editor already installed on this machine (4.3-stable mono), not a bundled/managed engine. Trigger on "RPG", "Godot", "GDScript", ".gd", "3D character controller", "quest system", "inventory", "dialogue tree", "combat state machine", "NPC pathing", "save game".
version: 0.1.0
author: hugouchija44 (skill-doc + GDScript validator wired to the installed Godot 4.3 mono; complements the pre-installed gdscript-patterns/make-game/game-feel skills)
license: MIT
metadata:
  ego:
    tags: [Godot, GDScript, RPG, 3D, Game-Dev, Validator, Check-First]
    related_skills: [ego-restraint, gdscript-patterns, make-game, game-feel, host-authoritative-state]
    engine: [C:/Users/h/Desktop/godot2/Godot_v4.3-stable_mono_win64]
    scripts: [scripts/validate_gdscript.mjs]
    ensure: [godot-rpg]
---

# godot-rpg — 3D RPG development on the Godot already installed

This skill is the ego's hand for Godot work: 3D RPG architecture patterns in GDScript, plus a real
validator that runs edited `.gd` files through the actual Godot binary before you trust them. It does
**not** ship, download, or manage a Godot build — comprobar-primero (`rules/40-check-first.md`) applies:
Godot is a heavy engine dependency, so this skill locates whatever is already on the machine and only
asks before fetching anything.

## Honesty note on the version

The original plan for this skill cited Godot 4.6. That version is not installed here. What **is**
installed and verified working is `Godot v4.3.stable.mono.official.77dcf97d8`, extracted at
`C:/Users/h/Desktop/godot2/Godot_v4.3-stable_mono_win64/` — with one wrinkle worth knowing: the zip
extraction nests an extra folder, so the actual executable sits one level deeper than that path implies,
at `Godot_v4.3-stable_mono_win64/Godot_v4.3-stable_mono_win64/Godot_v4.3-stable_mono_win64.exe` (plus a
`_console.exe` variant). This skill uses **that** Godot — 4.3, mono — not 4.6. GDScript 4.x syntax is
stable enough across 4.3→4.6 that the patterns below hold either way, but do not claim 4.6 features
(e.g. anything introduced after 4.3) work here without checking the installed version first.

## Locating Godot: `/ensure-engine godot-rpg`

Before relying on any Godot invocation, run `/ensure-engine godot-rpg` (or `node .claude/ensure.mjs
godot-rpg` directly). It is check-first and idempotent:

- **Present** (this machine, today): it locates the nested `.exe` under `~/Desktop/godot2` and exits 0
  as a no-op — nothing is downloaded, nothing is rebuilt.
- **Missing**: Godot is a heavy engine and the descriptor never guesses a download URL or a mono-vs-
  standard variant for you — it refuses and asks you to fetch `godotengine.org/download` yourself, or
  set `GODOT_BIN` (path to the exe) / `GODOT_ROOT` (a folder to search) if it lives somewhere else.
- Resolution order: `GODOT_BIN` env var → `godot(.exe)`/`godot4(.exe)` on `PATH` → a recursive search
  (3 levels) under `GODOT_ROOT` or `~/Desktop/godot2`.

The `scripts/validate_gdscript.mjs` validator (below) uses the exact same resolution order, so "ensure
says it's present" and "the validator can run" are the same fact, not two things that can drift apart.

## The edit → validate flow

1. Edit a `.gd` file with `Edit`/`Write`. `post-tool-use.mjs` already fires an informational reminder
   on any `.gd` write ("corre su validador GDScript") — that hook doesn't validate anything itself, it
   just flags that this skill's step 2 is next.
2. Run the real validator:

   ```
   node .claude/skills/godot-rpg/scripts/validate_gdscript.mjs <file.gd|dir> [more ...] [--method=auto|gdlint|godot|ligero]
   ```

   It takes files or directories (recurses, skipping `.git`/`.godot`/`.import`) and check-first
   **cascades** through whatever is actually available on this machine, best to worst, reporting which
   one it used:
   1. `gdlint` (gdtoolkit) if on `PATH` or in the EGO venv (`E:/skill/ego/.venv`).
   2. `godot --headless --check-only --script <file>` — Godot's own "parse for errors and quit" mode —
      if a Godot binary is located (same resolution as `/ensure-engine godot-rpg`: `GODOT_BIN` → `PATH`
      → `~/Desktop/godot2`, verified against the real installed 4.3 mono binary).
   3. A zero-dependency lightweight lint (bracket balance, unclosed strings, mixed tab/space
      indentation, missing `:` on `func`/`if`/`for`/… blocks) — always available, so the validator
      never simply refuses to run.
   Per file it prints `OK` or `PROBLEMAS` with line numbers, then a summary line naming the method
   used. Exit 0 means every file was actually checked and came back clean; exit 1 means at least one
   file has a real problem — never a silent skip.
3. If it fails, fix the reported line and re-run. When the `godot` method is in play, the problem text
   is Godot's own `SCRIPT ERROR`/`Parse Error` message, not a paraphrase.

This is a syntax/parse check, not a semantic one: even at its strongest (the `godot` method) it catches
malformed GDScript before you waste a run of the actual game, but it does not catch logic bugs, missing
nodes at runtime, or signal-wiring mistakes — for that, actually run the scene
(`playtesting-a-feature` skill, or `summer_play`/`summer_get_script_errors` if the summer-engine MCP is
connected to this project).

## RPG-specific GDScript patterns

These are architecture-level patterns for the RPG domain specifically — data-driven items, quest state,
combat AI, NPC navigation, save/load. For syntax-level GDScript conventions (type hints, `@onready`,
signal declaration order, `_ready` vs `_process`), defer to the already-installed `gdscript-patterns`
skill instead of duplicating it here. Every snippet below was run through `--check-only` against the
installed Godot 4.3 mono and parses clean.

**Combat/AI state machine** — an enum-driven state on the actor, not a scattered pile of booleans:

```gdscript
class_name CombatState
extends Node

signal state_changed(new_state: State)

enum State { IDLE, CHASE, ATTACK, STAGGERED, DEAD }

var current: State = State.IDLE

func transition(to: State) -> void:
	if current == to:
		return
	current = to
	state_changed.emit(to)
```

**Data-driven items as `Resource`** — items, quests, and NPC stat blocks belong in `.tres` files backed
by a typed `Resource`, not hardcoded dictionaries scattered across scripts:

```gdscript
class_name Item
extends Resource

@export var id: StringName
@export var display_name: String
@export var icon: Texture2D
@export var stack_max: int = 99
```

**A signal-bus autoload for decoupled RPG systems** — quest, inventory, and dialogue systems should not
hold direct references to each other; they should each depend only on this:

```gdscript
extends Node
# Autoload: res://systems/event_bus.gd -> Project Settings -> Autoload -> "EventBus"

signal quest_updated(quest_id: StringName, stage: int)
signal item_acquired(item_id: StringName, amount: int)
signal dialogue_finished(npc_id: StringName)
```

**NPC navigation** — `NavigationAgent3D` driving a `CharacterBody3D`, the standard Godot 4 pattern for
RPG town/overworld NPCs (requires a baked `NavigationRegion3D` in the scene):

```gdscript
extends CharacterBody3D

@export var move_speed: float = 3.5
@onready var nav_agent: NavigationAgent3D = $NavigationAgent3D

func set_target(pos: Vector3) -> void:
	nav_agent.target_position = pos

func _physics_process(_delta: float) -> void:
	if nav_agent.is_navigation_finished():
		return
	var next_pos: Vector3 = nav_agent.get_next_path_position()
	velocity = (next_pos - global_position).normalized() * move_speed
	move_and_slide()
```

**Save/load** — `FileAccess` + `JSON.stringify`/`parse_string` for a plain, inspectable save file (the
lazier and more debuggable option versus a binary `ResourceSaver` save for a first pass):

```gdscript
extends Node3D

func save_game(path: String, quest_log: Dictionary) -> void:
	var data: Dictionary = {
		"player_pos": [global_position.x, global_position.y, global_position.z],
		"quests": quest_log,
	}
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(JSON.stringify(data))

func load_game(path: String) -> Dictionary:
	var f := FileAccess.open(path, FileAccess.READ)
	var data: Dictionary = JSON.parse_string(f.get_as_text())
	var p: Array = data.get("player_pos", [0, 0, 0])
	global_position = Vector3(p[0], p[1], p[2])
	return data.get("quests", {})
```

## Skills and MCP already installed that complement this one

This machine already has a Godot/Summer-Engine skill pack at `~/.claude/skills/` (user scope, separate
from this repo's `.claude/skills/`) that this skill does not duplicate:

| Skill/MCP | What it covers | When to reach for it instead of/alongside this one |
|---|---|---|
| `gdscript-patterns` | Syntax-level GDScript conventions (type hints, signals, `@onready`, `_ready`/`_process`) | Any time you're writing GDScript — the baseline this skill builds architecture on top of |
| `make-game` | Full pipeline orchestration (brainstorm → scaffold → build → polish → ship) | Starting a new game from scratch, not just adding an RPG system to one that exists |
| `game-feel` | Hit-flash + camera shake + audio ducking ("juice") | Combat/impact feels flat — a separate concern from the state-machine architecture above |
| `mcp__summer-engine__*` (MCP) | Live scene tree ops (`summer_get_scene_tree`, `summer_add_node`, `summer_set_prop`, `summer_play`, `summer_get_script_errors`, …) | When the project is wired to the summer-engine MCP and you want to inspect/mutate the live editor scene instead of hand-editing `.tscn` text |

If those aren't installed for the current project, this skill still works standalone — it only needs
the Godot binary and `scripts/validate_gdscript.mjs`, both self-contained here.

## Decision rules

- Never claim a `.gd` edit is "done" or "valid" without running the validator — a hook reminder is not a
  check; the validator's exit code and reported method are.
- When the validator reports it fell back past `godot --check-only` to `lint-ligero`, say so — that is a
  weaker check (no real parser, just structural heuristics) and the report should not be presented with
  the same confidence as a real Godot parse.
- Never invent a Godot version or feature the installed binary doesn't have — report what `Godot
  --version` actually says (verify, don't recall).
- A heavy Godot download/reinstall is never triggered automatically — `/ensure-engine godot-rpg` asks
  first, per the machine's check-first invariant.
- 3D RPG architecture questions route here; raw GDScript syntax questions route to `gdscript-patterns`;
  "make me a whole game" routes to `make-game`; "combat feels flat" routes to `game-feel`.

## Failure modes to avoid

- Treating `--check-only` (or the `lint-ligero` fallback) as a full test suite — both are parse/structure
  checks, nothing more. Pair either with actual playtesting (`playtesting-a-feature`) before declaring a
  feature done.
- Duplicating `gdscript-patterns`' syntax-level content here instead of just deferring to it.
- Assuming the Godot path is exactly `Desktop/godot2/Godot_v4.3-stable_mono_win64/*.exe` — the real exe is
  one folder deeper due to zip extraction; always resolve through `/ensure-engine godot-rpg` or the
  validator's own lookup rather than hardcoding the shallow path.
- Reporting a `lint-ligero` clean pass as if Godot itself had parsed the file — the summary line names
  the method used precisely so this distinction isn't lost.

## Self-check

Did the validator actually run (not skipped, not assumed) and did its summary line get reported honestly
— including which of the three methods it fell back to? Is the reported Godot version the real installed
one, not the one from an old plan? Did a failing check carry the tool's own error text, not a paraphrase?
If yes, ship it.
