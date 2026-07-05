---
name: video-production
description: Motor de producción de vídeo/explainer del SO, cableado a ffmpeg 8.1.1 + ffprobe 8.1.1 (Gyan.FFmpeg full_build, YA instalados vía winget y en PATH) — transcribir (incluye el filtro whisper.cpp nativo del propio binario), cortar sin romper el sync A/V, quemar subtítulos, overlays, color grade, mux/transcode. Remotion es opcional vía `npx`, nunca obligatorio. Complementa — no sustituye — las skills de vídeo ya instaladas en la máquina (`video-use` para edición conversacional multi-take, `watch` para ver/preguntar sobre un vídeo) y los MCP generativos (higgsfield, Summer Engine) cuando no hay metraje real que editar sino que generar. Usa esta skill cuando la tarea sea manejar ffmpeg/ffprobe directamente: transcribir, cortar, subtitular, superponer overlays, colorear, verificar o transcodificar un vídeo concreto. Arranque: comprobar-primero — ffmpeg ya está presente, `/ensure-engine video-production` es un no-op; solo pregunta antes de algo pesado nuevo (un modelo whisper.cpp local, un scaffold de Remotion).
version: 0.1.0
author: hugouchija44 (ffmpeg/ffprobe 8.1.1 Gyan.FFmpeg full_build, instalados por winget en esta máquina)
license: MIT
metadata:
  ego:
    tags: [Video, ffmpeg, ffprobe, Subtitulos, Transcripcion, Whisper.cpp, Explainer, Overlays, Color-Grade, Engine]
    related_skills: [video-use, watch, asset-strategy, ego-restraint, ego-memory]
    ensure_engine: video-production
    engine: [ffmpeg, ffprobe]
---

# video-production — motor de vídeo/explainer sobre ffmpeg

Esta skill es la capa de **motor**: cablea el SO directamente a los binarios `ffmpeg`/`ffprobe` que ya
están instalados y en PATH en esta máquina. No es un envoltorio de otra skill ni un plan de instalación —
es el uso real, con comandos reales, de un binario real. Cuando la tarea pide algo más rico (edición
conversacional multi-take con memoria de proyecto, animaciones HyperFrames/Remotion/Manim) esa
responsabilidad ya vive en `video-use`; cuando la tarea es "mira este vídeo y responde", vive en `watch`.
Esta skill es la que se usa cuando quieres el control directo de ffmpeg: un corte puntual, quemar unos
subtítulos, transcribir con el filtro nativo, verificar un contenedor, transcodificar para entrega.

## Qué hay realmente en esta máquina (honestidad primero)

- `ffmpeg version 8.1.1-full_build-www.gyan.dev` y `ffprobe version 8.1.1` — ambos resueltos en PATH desde
  `...\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\`.
  Instalados con `winget`. **No hay que instalar ni reinstalar nada** para el 90% de lo que pide esta
  skill.
- El build está compilado con `--enable-libass --enable-libfreetype --enable-libfribidi
  --enable-libharfbuzz` (subtítulos quemados con tipografía real, sin dependencia extra), `--enable-whisper`
  (filtro `whisper` nativo, transcripción con whisper.cpp **dentro del propio ffmpeg**, sin Python), y
  aceleración por hardware si el driver existe (`--enable-nvenc --enable-cuvid --enable-amf
  --enable-libvpl --enable-vulkan`) además de los codecs software de siempre (`libx264 libx265 libvpx
  libaom libsvtav1`).
- El filtro `whisper` **existe en el binario pero no hay ningún modelo `ggml-*.bin` de whisper.cpp en esta
  máquina todavía** (comprobado con una búsqueda real, no asumido). Usarlo de verdad exige descargar un
  modelo — eso es "algo pesado nuevo": pregunta antes de traerlo (ver más abajo). Mientras no haya modelo,
  la transcripción real de esta máquina pasa por `video-use` (ElevenLabs Scribe) o `watch` (Whisper API vía
  Groq/OpenAI), que ya están configuradas para eso.
- `npx` (Node 24) está disponible, así que Remotion se puede invocar con `npx create-video@latest` sin
  instalarlo por adelantado — pero es opcional; no lo scaffoldees si un `overlay`/`drawtext` de ffmpeg
  basta.

## Cómo arrancar

1. **Comprobar-primero.** `node .claude/ensure.mjs video-production` (o `/ensure-engine video-production`).
   El descriptor localiza `ffmpeg` en PATH; como ya está, esto es un **no-op** — escribe/confirma el
   sentinel `~/.claude/engines-build/video-production.installed` y no descarga nada. No lo trates como un
   paso ceremonial: si algún día ffmpeg no estuviera, este mismo comando saldría con código 3 (motor
   "pesado" ausente) y pediría tu confirmación explícita antes de decirte cómo instalarlo — nunca lo
   instala solo.
2. **Solo si la tarea concreta pide algo que hoy no está** — un modelo whisper.cpp local para transcribir
   sin red, o un proyecto Remotion con dependencias propias — dilo explícitamente y pregunta antes de
   traerlo. Por defecto, usa lo que ya hay: ffmpeg crudo para todo lo determinista, y las skills
   `video-use`/`watch` para lo que ya resuelven con sus propias credenciales.
3. Verifica el material de entrada con `ffprobe` antes de tocar nada — nunca asumas fps, códec o
   contenedor por el nombre de archivo.

## Reglas duras de corrección de producción (no negociables)

Lo artístico —color, ritmo, tipografía, qué se corta— es libre. Estas no lo son: si se rompen, el vídeo
falla en silencio o no reproduce donde debería.

1. **Nunca romper el sync A/V.** Todo corte, concat o cambio de fps se verifica después con
   `ffprobe -show_entries stream=codec_type,duration,r_frame_rate,nb_frames` sobre el resultado, no solo
   sobre la fuente.
2. **Los subtítulos van SIEMPRE al final de la cadena de filtros**, después de cualquier overlay. Si
   `subtitles=…`/`ass=…` va antes que un `overlay`, el overlay tapa el subtítulo — fallo silencioso.
3. **Corte sin recodificar (`-c copy`) solo si el punto de corte cae en un keyframe** del stream de
   origen; si no, el corte queda en el frame equivocado o el player se cuelga un instante. Para un corte
   preciso en un punto arbitrario, recodifica ese segmento (o usa `-ss` **después** de `-i` para precisión
   a costa de una re-lectura más lenta).
4. **Concat solo entre clips con el mismo códec/resolución/tasa de muestreo** vía el demuxer `concat`
   (lista de archivos + `-c copy`); si los clips difieren, usa `filter_complex concat=n=N:v=1:a=1`, que
   recodifica pero tolera heterogeneidad. Mezclar ambos caminos produce timestamps rotos.
5. **Fundidos de 20–30ms en cada borde de corte de audio** (`afade=t=in:st=0:d=0.03`,
   `afade=t=out:st={dur-0.03}:d=0.03`) para no dejar un "pop" audible en el corte.
6. **El contenedor tiene que soportar el códec que le metes.** `mp4`/`mov` esperan H.264/H.265 + AAC (y
   subtítulos `mov_text` si van muxados, no quemados); `webm` espera VP9/AV1 + Opus/Vorbis, no H.264/AAC;
   `mkv` es el contenedor permisivo si necesitas mezclar. Elegir mal el contenedor para el códec es un
   archivo que "no reproduce" en el player de destino aunque ffmpeg lo haya escrito sin error.
7. **`-pix_fmt yuv420p` explícito en la entrega final** salvo que el destino soporte 10-bit/4:4:4 a
   propósito — de lo contrario, muchos reproductores (y navegadores) muestran verde/morado o rechazan el
   archivo.
8. **Verifica antes de declarar terminado.** `ffprobe` sobre la salida — duración, streams, códec — antes
   de decir "listo". No afirmes sync o duración sin haberla mirado (invariante de honestidad).

## Recetas ffmpeg (comandos reales, no pseudocódigo)

**Inspeccionar antes de tocar nada:**
```
ffprobe -v error -show_format -show_streams -of json entrada.mp4
```

**Cortar sin recodificar** (el punto de corte debe caer en un keyframe; si no estás seguro, añade
`-force_key_frames` al codificar el original o recodifica el segmento):
```
ffmpeg -ss 00:00:12.000 -i entrada.mp4 -to 00:00:18.000 -c copy -avoid_negative_ts make_zero salida.mp4
```

**Corte preciso** (arbitrario, con recodificación del segmento):
```
ffmpeg -i entrada.mp4 -ss 12.34 -t 5.66 -c:v libx264 -crf 18 -c:a aac salida.mp4
```

**Concat homogéneo (misma fuente/códec), lista de segmentos:**
```
ffmpeg -f concat -safe 0 -i lista.txt -c copy salida.mp4
```
`lista.txt` con líneas `file 'C:/ruta/segmento1.mp4'`.

**Transcribir con el filtro nativo `whisper`** (requiere un modelo `ggml-*.bin` de whisper.cpp —
descárgalo solo si el usuario confirma que quiere este camino en vez de `video-use`/`watch`):
```
ffmpeg -i entrada.mp4 -vn -af "whisper=model=/ruta/ggml-base.bin:language=es:format=srt:destination=salida.srt" -f null -
```

**Subtítulos quemados, SIEMPRE último filtro:**
```
ffmpeg -i entrada.mp4 -vf "subtitles=salida.srt:force_style='FontName=Arial,FontSize=20,Outline=2'" -c:a copy salida_sub.mp4
```

**Overlay de una animación/PNG-sequence, con PTS realineado a la ventana de aparición:**
```
ffmpeg -i base.mp4 -i overlay.mov -filter_complex \
 "[1:v]setpts=PTS-STARTPTS+5/TB[ov];[0:v][ov]overlay=enable='between(t,5,10)'" \
 -c:a copy salida_overlay.mp4
```

**Color grade simple (contraste/curva/saturación), aplicado por segmento antes del concat, no después:**
```
ffmpeg -i segmento.mp4 -vf "eq=contrast=1.08:saturation=0.9,curves=preset=medium_contrast" -c:a copy segmento_graded.mp4
```

**Entrega final compatible ancha:**
```
ffmpeg -i timeline.mp4 -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k final.mp4
```

Ninguno de estos valores (CRF, fuente, colores del `force_style`, presets de `eq`/`curves`) es un mandato:
son ejemplos que funcionan hoy en esta máquina. Ajusta al material y a lo que pida el usuario — lo
artístico es libre.

## Cuándo delegar en las skills de vídeo ya instaladas

En `~/.claude/skills/` ya viven dos skills de vídeo más completas que esta, instaladas por el usuario:

- **`video-use`** — edición conversacional multi-take con memoria de proyecto (`project.md`), transcripción
  vía ElevenLabs Scribe (word-level, cacheada), animaciones HyperFrames/Remotion/Manim/PIL, sus propias
  reglas duras de producción (`SKILL.md` con 12 reglas: subtítulos al final, corte por segmento + concat
  sin recodificar, fades de 30ms, etc. — el mismo espíritu que las reglas de arriba, más elaborado). Úsala
  cuando la tarea sea "edita esta entrevista/vlog/tutorial hablando conmigo", con múltiples tomas o una
  narrativa que armar, no un comando ffmpeg suelto.
- **`watch`** — descarga con `yt-dlp`, extrae frames y transcript (captions o Whisper API) para que el
  agente pueda **ver y responder preguntas** sobre un vídeo. Úsala cuando la tarea es entender/analizar un
  vídeo, no producir uno.

Esta skill (`video-production`) es la que usas cuando ninguna de las dos aplica: un comando ffmpeg directo,
una verificación con ffprobe, un corte o un subtitulado puntual sin el aparato de proyecto de `video-use`.
Las tres pueden convivir en la misma sesión — no son excluyentes.

## Complementos generativos (cuando no hay metraje que editar, sino que generar)

Si la tarea no parte de un vídeo real sino que pide generar uno desde cero (un explainer sin footage, un
clip sintético, una voz, una animación 3D), esta skill no genera píxeles nuevos — solo los edita. Para
generar, esta máquina ya tiene MCPs disponibles:

- **higgsfield** (`mcp__claude_ai_higgsfiel__*`) — `generate_video`, `explainer_video`,
  `get_workflow_instructions`/`resolve_explainer_preset` para vídeos guionizados de principio a fin,
  `dubbing`, `generate_audio`, `reframe`, `upscale_video`.
- **Summer Engine** (`mcp__summer-engine__*`) — `summer_generate_video`, `summer_generate_motion`,
  `summer_generate_audio` para motion/vídeo/audio generativo dentro de un proyecto Godot/juego.

El flujo natural es: genera el material con el MCP que corresponda → una vez existe como archivo, esta
skill (`video-production`) o `video-use` lo cortan, subtitulan, gradúan o componen. No uses un generador
para lo que ffmpeg ya resuelve determinísticamente (un corte, un fundido, un subtítulo), y no uses ffmpeg
para inventar contenido que no existe todavía.

## Remotion (opcional, vía `npx`, comprobar-primero)

Remotion no está instalado como dependencia del sistema y no hace falta que lo esté: `npx` (Node 24 ya
presente) lo resuelve al vuelo (`npx create-video@latest` para scaffoldear, `npx remotion render` dentro
del proyecto ya scaffoldeado). Solo tiene sentido montarlo cuando la animación pide composición React con
estado (texto animado con lógica, un sistema de diseño reutilizable) — para una tarjeta de overlay simple,
un contador o un texto que se escribe, `drawtext`/`overlay` de ffmpeg (o PIL + PNG-sequence, como ya hace
`video-use`) es más barato y no añade una dependencia nueva. Si la tarea sí lo justifica, trátalo como
"algo pesado nuevo": confirma con el usuario antes de scaffoldear el proyecto, igual que con cualquier
descarga grande.

## Invariantes que gobiernan esta skill

- **Honestidad sin ocultación.** No declares "listo" sin haber corrido `ffprobe` sobre la salida. Si el
  filtro `whisper` falla por falta de modelo, dilo tal cual — no finjas una transcripción.
  Comprobado en esta sesión: `ffmpeg -af whisper=model=/ruta-inexistente...` falla exactamente con
  `whisper_init_from_file_with_params_no_state: failed to open` — ese es el error real que verás si el
  modelo no está, no un bug de la skill.
- **Firefighter caps (restricción).** Un corte puntual no necesita un proyecto `video-use` completo con
  `edit/` y memoria persistida; un vídeo de una toma no necesita animaciones ni color grade si nadie los
  pidió. El alcance lo marca la petición.
- **Seguridad inward-only.** Esta skill no toca red salvo la que ya gestionan `video-use` (ElevenLabs) y
  `watch` (yt-dlp, Groq/OpenAI) bajo sus propias credenciales — no amplíes esa superficie por tu cuenta.

## Auto-chequeo antes de cerrar

¿Comprobé `/ensure-engine video-production` (aunque sea un no-op) en vez de asumir que ffmpeg está?
¿Los subtítulos quedaron como último filtro? ¿El corte respeta keyframes o se recodificó a propósito?
¿El contenedor de salida soporta el códec elegido? ¿Corrí `ffprobe` sobre la salida antes de decir
"terminado"? ¿Elegí el motor correcto — ffmpeg crudo, `video-use`, `watch`, o un MCP generativo — para lo
que realmente pedía la tarea, sin sobre-construir?
