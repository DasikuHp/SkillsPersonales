# Procedencia

- **Motor real:** `ffmpeg`/`ffprobe` **8.1.1-full_build-www.gyan.dev** (Gyan.FFmpeg), instalados en esta
  máquina vía `winget` y ya resueltos en PATH en
  `C:\Users\h\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\
  ffmpeg-8.1.1-full_build\bin\`. Verificado con `ffmpeg -version` / `ffprobe -version` y `where ffmpeg`/
  `where ffprobe` en esta sesión — no asumido.
- **Skill de referencia (diseño), no de código:** el repo `videoskill`/`dasikuhp videoskill` citado en el
  plan **no se encontró por nombre en esta máquina** (ni en `~/.claude/skills/`, ni en `C:/claude-SO`, ni
  en rutas obvias del usuario). Se buscó explícitamente y no apareció — este `_SOURCE.md` lo dice tal cual
  en vez de fingir que se portó algo que no existe (invariante de honestidad). En su lugar, la skill se
  apoya en dos fuentes reales presentes en la máquina:
  1. **`ffmpeg`/`ffprobe` del sistema** (arriba) — el motor real, sin stub.
  2. **Las skills de vídeo del usuario ya instaladas** en `~/.claude/skills/video-use/` y
     `~/.claude/skills/watch/` (ambas con `SKILL.md` real, `video-use` con `scripts/`, `helpers/`,
     `install.md` propios). Se leyeron sus `SKILL.md` completos para tomar prestado el **espíritu** de sus
     reglas duras de producción (subtítulos al final de la cadena de filtros, corte por segmento +
     concat sin recodificar, fades de 30ms en los cortes, verificación antes de declarar terminado) y
     adaptarlas a comandos ffmpeg directos — no se copió código ni prosa suya línea a línea, se
     referencian como skills complementarias que la máquina ya tiene, no como código fuente vendorizado.
- **Sin instalación nueva.** No se instaló ni reinstaló ffmpeg, Python, Remotion ni ningún paquete. Se
  verificó (con `ffmpeg -hide_banner -filters` / `-h filter=whisper` / `-encoders`) que el binario ya
  presente en esta máquina incluye de fábrica: `--enable-libass --enable-libfreetype --enable-libfribidi
  --enable-libharfbuzz` (subtítulos quemados sin dependencia extra) y `--enable-whisper` (filtro `whisper`
  nativo, whisper.cpp embebido en el propio binario). Se probó el filtro `whisper` con un modelo
  inexistente a propósito para confirmar el mensaje de error real
  (`whisper_init_from_file_with_params_no_state: failed to open`) y documentarlo tal cual en el `SKILL.md`
  — no se asumió el comportamiento, se observó.
- **Búsqueda real de modelos whisper.cpp:** se buscó `ggml-*.bin` en `~/.claude`, `~/.cache`,
  `~/AppData/Local` y no se halló ninguno (solo DLLs de runtime de Docker Model Runner, sin relación). Por
  eso el `SKILL.md` marca la ruta del filtro `whisper` nativo como "opcional, requiere descargar un modelo
  primero" en vez de darla por operativa.
- **npx / Node 24** ya presente (`node --version` → v24.15.0, `npx --version` → 11.12.1) — confirma que
  Remotion es alcanzable sin instalación previa (`npx create-video@latest`), pero no se scaffoldeó nada:
  sigue siendo opcional y bajo demanda.
- **MCPs generativos mencionados como complemento** (no motor de esta skill): `mcp__claude_ai_higgsfiel__*`
  (higgsfield) y `mcp__summer-engine__*` (Summer Engine) — ambos ya visibles como herramientas en este
  runtime; se referencian por nombre real de tool, no inventado.

## Qué se portó (y qué no)

- **Portado:** ninguna prosa ni código de un repo externo — no había un repo `videoskill` que portar. Lo
  que se portó es **conocimiento de producción** (las reglas duras de A/V sync, orden de filtros,
  contenedor/códec) ya validado en `video-use/SKILL.md`, reescrito como recetas ffmpeg directas para esta
  skill.
- **No portado:** ningún `scripts/`, `helpers/` ni dependencia de `video-use` — esta skill no vendoriza su
  código, apunta a él como skill hermana ya instalada (`~/.claude/skills/video-use/`,
  `~/.claude/skills/watch/`) para cuando la tarea pide su nivel de sofisticación (proyecto multi-take,
  memoria, animaciones).

## Wiring (comprobar-primero)

- **Descriptor `video-production` en `.claude/ensure.mjs`** (`ENGINES['video-production']`): `locate()`
  resuelve `ffmpeg` en PATH (`onPath('ffmpeg.exe')` en Windows) y devuelve `ok:true` con el path real
  encontrado; como ffmpeg ya está, `/ensure-engine video-production` es un **no-op** que solo escribe/
  confirma el sentinel `~/.claude/engines-build/video-production.installed`
  (`{"engine":"video-production","version":"ffmpeg-8", ...}` — ya presente en esta máquina, verificado
  con el hash `sha256("video-production@ffmpeg-8").slice(0,16)` = `0943dd36e3c6ec83`, coincide con el
  sentinel real en disco). Si ffmpeg faltara, el descriptor está marcado `heavy: false` porque en esta
  máquina no hace falta instalar nada — el `install()` de ese descriptor, si algún día se invoca sin
  ffmpeg presente, no descarga nada por su cuenta: dice que es una dependencia de sistema
  (`winget install Gyan.FFmpeg`) para que el usuario decida.
- **Sin servidor MCP propio.** Esta skill no registra nada en `.mcp.json` — es un motor de línea de
  comandos (ffmpeg/ffprobe), no un servidor. La invocación es `Bash` directo.
- **`related_skills`** en el frontmatter (`video-use`, `watch`, `asset-strategy`, `ego-restraint`,
  `ego-memory`) — las cuatro primeras ya existen tal como se documentan aquí; `ego-memory` para persistir
  decisiones de producción reutilizables (un `force_style` de subtítulos que funcionó, una cadena de color
  aprobada) entre sesiones.

## Honestidad explícita (por si se relee este fichero después)

No existe en esta máquina, bajo ningún nombre buscado, un repo o skill llamado `videoskill` (ni de
`dasikuhp` ni de otro autor) que pudiera citarse como fuente de código portado. Cualquier lectura de este
`_SOURCE.md` que asuma lo contrario está mal informada: la skill se construyó sobre lo que sí está
verificado en la máquina — el binario ffmpeg/ffprobe del sistema y las skills `video-use`/`watch` ya
instaladas — no sobre un repo que no se localizó.
