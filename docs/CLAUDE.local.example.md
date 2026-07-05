# CLAUDE.local.md — Preferencias de máquina

Este archivo define dónde están los motores y binarios externos en tu máquina local. No se versionea
(está en `.gitignore`). Cópialo a `~/.claude/CLAUDE.local.md` y reemplaza los valores de ejemplo con
tus rutas reales. El SO lo carga en `session-start.mjs` y en los launchers de MCP.

## Variables

**EGO_ROOT** — Ruta absoluta del plugin EGO real (donde vive el venv con `ego_memory`, `ego_simbionte`,
`ego_toolbelt`). Si no está definida, `ensure.mjs` intenta encontrarlo; si no existe, solicita
`/ensure-engine`. En Windows es típicamente una ruta con disco + backslash. Ejemplo: `E:\skill\ego`.

**GODOT_BIN** — Ruta absoluta al ejecutable de Godot 4.3+ (mono). El skill `godot-rpg` y su `ensure`
lo requieren. Si no está, `/ensure-engine` lo solicita. Godot debe estar en el PATH o con ruta
completa aquí. Ejemplo: `C:\Users\h\Desktop\godot2\Godot_v4.3-stable_mono_win64.exe`.

**FFMPEG_BIN** — Ruta absoluta a ffmpeg (versión 8.0+). El skill `video-production` lo usa. Si no está,
`ensure.mjs` intenta buscarlo en el PATH; si falla, solicita `/ensure-engine`. Ejemplo:
`C:\Program Files\ffmpeg\bin\ffmpeg.exe`.

**CBM_BIN** — Ruta absoluta al binario de `codebase-memory` (prebuilt). Es opcional: si no está,
el launcher intenta descargarlo (gated por `--confirmed`, rule `40-check-first`). El binario oficial
está en la release DeusData v0.8.1. Ejemplo: `C:\Users\h\AppData\Local\Temp\codebase-memory-windows.exe`.

**EGO_PXPIPE** — Opt-in para el canal pxpipe (portOpen bypass para Fable en Claude Code). Valores:
`1` (activado) o `0` (desactivado, defecto). Nunca se aplica en Opus. Ver `docs/PXPIPE.md`.

## Plantilla comentada

Reemplaza esto en `~/.claude/CLAUDE.local.md`:

```yaml
# Preferencias locales de EGO OS
# Cópialo desde docs/CLAUDE.local.example.md y reemplaza las rutas.
# Gitignored. Se carga en session-start + launchers.

EGO_ROOT=E:\skill\ego
GODOT_BIN=C:\Users\h\Desktop\godot2\Godot_v4.3-stable_mono_win64.exe
FFMPEG_BIN=C:\Program Files\ffmpeg\bin\ffmpeg.exe
CBM_BIN=
EGO_PXPIPE=0
```

## Notas de máquina (hoy, 2026-07-06)

La máquina tiene `E:\skill\ego` cableado: venv SAT activo, 3 MCP servers Python registrados user-scope
(`ego-memory`, `ego-simbionte`, `ego_toolbelt`), 8 skills + SEAL. Los datos reales del plugin no se
reproducen aquí: si alguno falta o cambia, el install/ensure te lo dirá via la regla `40-check-first`
(comprueba primero, pregunta antes de lo pesado, idempotencia). Godot 4.3 mono está instalado. FFmpeg
8.1 presente. Sin compilador C: la compilación de `codebase-memory` está descartada; el binario prebuilt
está gated. El kernel y rules viven en el repo y se distribuyen via `install.ps1` (aditivo, no destructivo).

## Cómo usar

1. Lee esta plantilla.
2. Localiza en tu máquina: EGO_ROOT (`E:\skill\ego`), GODOT_BIN, FFMPEG_BIN, CBM_BIN (si quieres).
3. Copia el bloque YAML de arriba a `~/.claude/CLAUDE.local.md`.
4. Reemplaza los valores de ejemplo con tus rutas.
5. Guarda.
6. Reinicia Claude Code. `session-start.mjs` lo cargará via `process.env.EGO_ROOT`, etc.

Si algo falta o es distinto, `/ensure-engine` te lo dirá y te pedirá confirmación (rule `40`). No
inventes rutas: si un binario no existe, el hook lo bloqueará o lo reportará fielmente (invariante 2,
honestidad sin ocultación).
