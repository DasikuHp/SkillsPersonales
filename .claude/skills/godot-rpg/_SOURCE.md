# _SOURCE — godot-rpg

**Fuente:** el plan original citaba una skill de referencia (`dasikuhp/skillsclaude`) y Godot 4.6.
Ninguno de los dos se encontró por ese nombre en esta máquina: no hay repo `skillsclaude` clonado ni
paquete con ese nombre, y el único Godot instalado es 4.3, no 4.6. Comprobar-primero exige cablear a lo
que existe de verdad, no al plan — así que esta skill se escribió desde cero contra dos cosas que sí
están presentes y verificadas:

- **Godot real**: `Godot v4.3.stable.mono.official.77dcf97d8`, extraído en
  `C:/Users/h/Desktop/godot2/Godot_v4.3-stable_mono_win64/`. La extracción del zip anida una carpeta
  extra — el `.exe` real vive en
  `Godot_v4.3-stable_mono_win64/Godot_v4.3-stable_mono_win64/Godot_v4.3-stable_mono_win64.exe` (más un
  `_console.exe`), no en la ruta superficial. Verificado con `--version` y con `--headless --check-only
  --script <f>` contra un `.gd` válido (exit 0) y uno inválido (exit 1 + `SCRIPT ERROR: Parse Error:
  Expected ":" after function declaration.`).
- **Skills de juego ya instaladas** en `~/.claude/skills/` (scope de usuario, formato distinto al hermes
  de este repo: `license/compatibility/category/user-invocable/allowed-tools/paths`): `gdscript-patterns`,
  `make-game`, `game-feel`, y ~25 más de un pack tipo Summer Engine, con el MCP `mcp__summer-engine__*`
  ya deferido y disponible en esta sesión. No se copian ni se reescriben — `godot-rpg` las referencia
  como complementos (tabla en el `SKILL.md`) y evita duplicar lo que ya cubren (sintaxis GDScript básica,
  orquestación de pipeline, juice/vfx).

**Qué se portó (todo nuevo, no un port 1:1 de un archivo ajeno):**

- `SKILL.md` — frontmatter hermes (name/description/version/author/license/metadata) + cuerpo en prosa:
  nota de honestidad sobre 4.3 vs 4.6, cómo `/ensure-engine godot-rpg` localiza Godot, el flujo
  edición→validación, cinco patrones GDScript de arquitectura RPG (state machine de combate, ítems como
  `Resource`, event bus de señales, navegación de NPC con `NavigationAgent3D`, save/load con
  `FileAccess`+`JSON`) — **cada snippet se corrió de verdad** contra el Godot instalado
  (`--headless --check-only --script`) antes de escribirse aquí; los cinco parsean limpio.
- `scripts/validate_gdscript.mjs` — validador real, sin stub. Cascada comprobar-primero: `gdlint`
  (gdtoolkit, si está en `PATH` o en el venv EGO) → `godot --headless --check-only --script <f>` (si hay
  Godot) → un lint ligero de cero dependencias (balance de brackets, strings sin cerrar, indentación
  mezclada, `:` faltante en bloques `func/if/for/…`) que siempre está disponible, así el validador nunca
  se niega a correr. Reporta por archivo `OK`/`PROBLEMAS` con línea y qué método se usó. Verificado en
  esta sesión con `--method=godot`, `--method=ligero` y automático (`auto`, cascada real) contra un `.gd`
  válido, uno inválido, y los cinco snippets del `SKILL.md`; en los tres modos detecta bien el error real
  (`bad.gd` línea 3) con exit 1, y exit 0 quedó confirmado en los archivos limpios.

**Nota sobre el archivo del validador:** este archivo fue escrito e iterado por más de un agente en la
misma sesión (el harness señaló una modificación externa a mitad de tarea); la versión que quedó — la
cascada de tres métodos descrita arriba — es la que se verificó y describe el `SKILL.md`. Si se vuelve a
tocar este script, hay que releer ambos antes de editar para que la doc no describa un comportamiento
que el código ya no tiene.

## Wiring

- **`/ensure-engine godot-rpg`**: descriptor ya registrado en `.claude/ensure.mjs` → `ENGINES['godot-
  rpg']`. `locate()` prueba `GODOT_BIN` → `godot(.exe)`/`godot4(.exe)` en `PATH` → búsqueda recursiva (3
  niveles) bajo `GODOT_ROOT` o `~/Desktop/godot2` (misma lógica, independiente, en
  `scripts/validate_gdscript.mjs`, para que "ensure dice que está" y "el validador puede correr" sean el
  mismo hecho). `install()` nunca descarga solo: Godot es pesado (`heavy: true`) y elegir versión/variante
  (mono vs standard) es decisión del usuario — se rechaza y apunta a `godotengine.org/download` o a
  definir `GODOT_BIN`/`GODOT_ROOT`. Probado en esta sesión: `node .claude/ensure.mjs godot-rpg` → exit 0,
  `✓ godot-rpg ya presente`, sentinel escrito en `~/.claude/engines-build/godot-rpg.installed`.
- **`post-tool-use.mjs`**: ya trae el aviso de `.gd` (bloque "(3) GDSCRIPT VALIDATION FLAG") apuntando a
  esta skill — no se tocó, ya estaba cableado antes de este porte.
- **`CLAUDE.md`** (kernel): la fila de la tabla de skills decía "RPG 3D en Godot 4.6"; se corrigió a "4.x
  (4.3-stable mono instalado)" — único cambio de una línea fuera de los dos archivos pedidos, para no
  dejar una afirmación falsa en el kernel sabiendo que es falsa (invariante de honestidad).
- **Skills complementarias** (`gdscript-patterns`, `make-game`, `game-feel`) y el MCP `summer-engine`: no
  se cablean aquí — ya existen y funcionan independientemente; `godot-rpg` solo los referencia por nombre
  en la tabla de rutas del `SKILL.md`.

## Estado

Operativo de punta a punta en esta máquina: Godot localizado, validador probado con casos reales
(archivo válido, archivo inválido, cinco patrones RPG), `/ensure-engine godot-rpg` confirmado con exit 0.
Nada de esto es un stub ni una descripción de algo que "debería" funcionar — todo se ejecutó y se citó su
salida real arriba.
