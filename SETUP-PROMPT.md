# EGO OS — SETUP-PROMPT (arranque en frío)

Pega todo lo que sigue a la línea horizontal en una sesión limpia de Claude Code (Windows) en la
máquina del usuario. Son instrucciones directas para que Claude Code verifique, complete e instale
EGO OS sin rehacer nada de lo que ya está presente.

---

Eres Claude Code en la máquina Windows del usuario. Vas a arrancar EGO OS, el sistema operativo
simbiótico del repo `DasikuHp/SkillsPersonales` (rama `claude/repo-analysis-report-pqd7ry`).
Dos reglas gobiernan todo el proceso y no se negocian:

1. **Comprobar-primero**: antes de instalar, clonar, descargar o compilar, comprueba si ya está.
   Si está, no-op. Si falta y es pesado, pregunta al usuario antes. Toda operación debe ser idempotente.
2. **Seguridad inward-only**: cualquier herramienta ofensiva/de red se usa SOLO contra la app propia
   del usuario (localhost, redes privadas, hosts de `engagement/scope.json`). Jamás un host externo,
   ni "solo para mirar". El hook `post-tool-use.mjs` lo bloquea; no intentes evadirlo.

Trabaja en prosa, honesto, sin postámbulo. Si algo difiere de lo esperado, repórtalo tal cual y adapta.

## Paso 0 — Repo

```powershell
$repo = 'C:\claude-SO\SkillsPersonales'
if (Test-Path "$repo\.git") {
  git -C $repo fetch origin claude/repo-analysis-report-pqd7ry
  git -C $repo checkout claude/repo-analysis-report-pqd7ry
  git -C $repo pull --ff-only origin claude/repo-analysis-report-pqd7ry
} elseif (Test-Path "$repo\install.ps1") {
  # Árbol ya presente sin .git (copia local): úsalo tal cual, no lo pises con un clone.
} else {
  git clone -b claude/repo-analysis-report-pqd7ry https://github.com/DasikuHp/SkillsPersonales.git $repo
}
```

## Paso 1 — Inventario (no toques nada todavía)

Esta máquina ya tiene mucho instalado. Verifícalo — no lo asumas ni lo reinstales:

```powershell
Test-Path E:\skill\ego\.venv\Scripts\python.exe        # plugin EGO real del usuario (venv SAT: pysat, fastembed)
claude mcp list                                         # espera ego-memory, ego-simbionte, ego-toolbelt (user-scope, los provee el plugin)
Get-ChildItem "$env:USERPROFILE\.claude\engines-build" -Filter *.installed -ErrorAction SilentlyContinue
Test-Path "$env:USERPROFILE\.claude\ego-os.manifest.json"   # si existe, EGO OS ya se instaló antes (install.ps1 será no-op)
node --version; python --version                        # esperados: node 24, python 3.13
ffmpeg -version | Select-Object -First 1                # esperado: ffmpeg 8.1
```

Godot 4.3 mono está instalado (lo localiza `ensure.mjs` en `Desktop\godot2`, `C:\godot`, PATH o
`GODOT_BIN`). **No hay compilador C** en la máquina; no propongas builds desde fuente.
Reporta el inventario al usuario antes de seguir: qué está, qué falta.

## Paso 2 — Repos locales SEAL/debate (detectar y enchufar, no clonar)

```powershell
@('E:\chimera\SEAL','E:\skill\SEAL','E:\skill\Multi-Agents-Debate','E:\skill\hermes-CCC','E:\skill\mythos-agent') |
  ForEach-Object { '{0} -> {1}' -f $_, (Test-Path $_) }
```

Los que existan quedan enchufados por referencia, no por instalación: `ego-self-edit` usa el SEAL
local (`E:\skill\ego\seal` y `E:\chimera\SEAL`), `ego-simbionte` usa el venv SAT del plugin, y
`hermes-CCC` es la fuente de la que se portaron las skills EGO. `mythos-agent` habilitaría las tools
`sec.mythos_*` de `ego-toolbelt` solo si se construye — es un build aparte y está diferido: no lo
hagas sin que el usuario lo pida explícitamente. Si alguno falta, solo repórtalo; no clones nada.

## Paso 3 — Instalar EGO OS (aditivo, reversible)

`install.ps1` NO clobbea `~/.claude` ni crea symlinks: hace backup con timestamp, copia aditiva
(salta ficheros idénticos, avisa en conflictos), escribe un manifest para `uninstall.ps1`, y añade
solo los hooks net-new (PostToolUse = security gate + contador debug, Stop) para no duplicar los
SessionStart/UserPromptSubmit que ya aporta el plugin ego. Primero en seco, revisa la salida, luego real:

```powershell
powershell -ExecutionPolicy Bypass -File C:\claude-SO\SkillsPersonales\install.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File C:\claude-SO\SkillsPersonales\install.ps1
```

El script además: verifica que los MCP `ego-*` ya están registrados (y los omite), registra
`codebase-memory` user-scope con su launcher perezoso si falta, hace merge no destructivo de MCP en
Claude Desktop si está instalado, genera `dist/web/PROJECT-INSTRUCTIONS.md` (kernel + rules para
Projects de claude.ai) y corre el smoke test al final. Flags que NO debes activar por tu cuenta:
`-AllHooks` (duplicaría hooks con el plugin ego) y `-EnablePxpipe` (pxpipe es opt-in, OFF por
defecto, y nunca corre en Opus). Ejecutarlo dos veces es no-op la segunda.

## Paso 4 — Smoke test

`install.ps1` ya lo corre; si sale con avisos o necesitas repetirlo a mano:

```powershell
'{"model":"claude-fable-5"}' | node "$env:USERPROFILE\.claude\hooks\session-start.mjs"
# espera: JSON con "EGO OS activo"
'{"tool_name":"Bash","tool_input":{"command":"nmap example.com"},"cwd":"C:/tmp"}' | node "$env:USERPROFILE\.claude\hooks\post-tool-use.mjs"
# espera: decision "block" (gate inward-only bloqueando un host externo)
node "$env:USERPROFILE\.claude\ensure.mjs" ego
# espera: exit 0 — "ya presente, no-op (comprobar-primero)"
```

Si el gate NO bloquea o session-start no responde, detente y repórtalo — no declares instalado lo
que no verificaste.

## Paso 5 — Completar la simbiosis que falte

Sé honesto sobre qué está cableado y qué está pendiente:

- **codebase-memory**: el cableado (launcher `mcp-launchers/codebase-memory.mjs` + registro MCP +
  `.mcp.json`) queda listo en el paso 3, pero el **binario prebuilt aún no está provisto** — está
  gated por comprobar-primero. Comprueba: `node C:\claude-SO\SkillsPersonales\.claude\ensure.mjs codebase-memory`.
  Exit 0 = ya está. Exit 3 = falta y es pesado: **pregunta al usuario** y, solo si acepta, ejecuta
  `node C:\claude-SO\SkillsPersonales\.claude\ensure.mjs codebase-memory --confirmed` (descarga el
  prebuilt oficial v0.8.1 de DeusData/codebase-memory-mcp; `--from-source` no es viable aquí, no hay
  compilador C). También puedes usar el comando `/ensure-engine codebase-memory`.
- **appsec**: solo si el usuario va a auditar/atacar SU propia app, copia
  `engagement\scope.json.example` a `engagement\scope.json` y lista únicamente hosts propios y
  autorizados. Sin `scope.json` solo se permite localhost/redes privadas; el hook bloquea lo externo
  en cualquier caso.
- **Resto de motores** (no-op esperado, verifica y reporta):
  `node .claude\ensure.mjs video-production` (ffmpeg presente), `node .claude\ensure.mjs godot-rpg`
  (Godot 4.3 presente; si faltara, es pesado → exit 3, no descargues sin confirmación),
  `node .claude\ensure.mjs appsec-inward` (skill+agentes+rule del repo).

## Paso 6 — Cierre

Pide al usuario reiniciar Claude Code para cargar hooks, skills y commands nuevos, y que verifique
con `/ego-status`. Recuérdale las proyecciones: el SO completo (hooks/commands/agents/skills/MCP)
solo corre en Claude Code; Claude Desktop ya recibió los MCP en el paso 3 (skills soportadas, sin
hooks ni commands); para claude.ai web debe pegar `dist/web/PROJECT-INSTRUCTIONS.md` como
instrucciones de Project. Todo es reversible con
`powershell -ExecutionPolicy Bypass -File C:\claude-SO\SkillsPersonales\uninstall.ps1`
(usa el manifest; `-Purge` borra además sentinels/binarios de `engines-build`).

Cierra con un reporte honesto en prosa: qué ya estaba (y no tocaste), qué añadiste, qué smoke tests
pasaron con su salida real, y qué queda pendiente (típicamente el binario de codebase-memory si el
usuario no lo confirmó, y mythos-agent diferido). Nada de "todo listo" sin evidencia.
