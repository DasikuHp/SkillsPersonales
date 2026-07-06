# pxpipe — proxy de ahorro de tokens (opt-in, OFF por defecto)

pxpipe es un proxy que comprime el tráfico hacia la API para gastar menos tokens. En EGO OS es
**infraestructura opcional**, integrada por el hook `session-start.mjs`, y está **apagada por defecto**.
Es un proveedor externo, así que su activación es decisión explícita del usuario (regla
`40-check-first.md` §4: proveedores externos = opt-in).

## Por qué OFF por defecto y nunca en Opus

pxpipe es *lossy* con strings exactos (empaqueta texto en PNGs densos) y **se degrada en Opus**, que no
recupera bien esos PNGs. El hook lo **omite automáticamente en Opus** aunque esté activado, y solo lo
arranca en Fable-5 y modelos compatibles. Nunca lo elige el SO por ti.

## Cómo se activa (opt-in)

El hook `session-start.mjs` arranca pxpipe solo si se cumple **todo**:

1. Opt-in explícito: variable de entorno `EGO_PXPIPE=1`, **o** `pxpipe: "1"` en el estado de settings
   (`~/.claude/state/settings.json`). Sin esto, no hace nada.
2. El modelo no es Opus (si lo es, imprime "pxpipe omitido: se degrada en Opus" y sigue).
3. Comprobar-primero: si el puerto `47821` ya está escuchando, no arranca otra instancia; reutiliza la
   existente.

Si todo se cumple, lanza `npx pxpipe-proxy` (detached) y sugiere `ANTHROPIC_BASE_URL=http://127.0.0.1:47821`
para enrutar el tráfico. Requisito: el paquete `pxpipe-proxy` debe poder resolverse con `npx` (red o caché).

## Cómo activarlo en la instalación

`install.ps1` pregunta si quieres habilitar pxpipe (default **No**). Si aceptas, persiste el opt-in en el
estado de settings; nunca lo activa sin tu confirmación. Para activarlo a mano en una sesión:

```powershell
$env:EGO_PXPIPE = "1"   # solo esta sesión
```

o escribe `{ "pxpipe": "1" }` en `~/.claude/state/settings.json` para dejarlo persistente (y `"0"` o
borra la clave para apagarlo).

## Desactivarlo

Quita `EGO_PXPIPE`, pon `pxpipe` a `"0"` en el estado, o simplemente no lo actives: el default es OFF.
El SO funciona igual sin pxpipe; solo cambia el gasto de tokens.
