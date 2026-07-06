---
description: Comprueba-primero y prepara (si falta y confirmas) un motor externo del SO. Idempotente.
argument-hint: "<engine> [--confirmed] [--from-source]"
allowed-tools: Bash, Read
---

# /ensure-engine — provisión comprobar-primero de motores

Prepara el motor **$ARGUMENTS** respetando el contrato de `rules/40-check-first.md`: primero comprueba si
ya está; si falta y es pesado, **no instala sin tu confirmación**; toda pasada es idempotente.

Motores conocidos: `ego` (plugin EGO + venv SAT/MCP, lo aporta el usuario), `codebase-memory` (binario C;
prebuilt oficial por defecto o `--from-source`). En F5 se añaden `video-production`, `godot-rpg`,
`appsec-inward`.

## Qué hacer

1. Ejecuta el contrato: `node .claude/ensure.mjs <engine>` (sin `--confirmed`).
   - **exit 0** → el motor ya está presente (o se registró su sentinel). No hay nada más que hacer.
   - **exit 3** → falta y es pesado. Lee lo que imprimió (qué descargaría/compilaría). **Antes de proceder,
     confírmalo con el usuario** (invariante comprobar-primero §2). Solo si el usuario acepta, re-ejecuta con
     `--confirmed` (y `--from-source` si pidió build desde fuente en vez del binario prebuilt).
   - **exit 2** → motor desconocido o falta el argumento; corrige el nombre.
2. Tras una instalación real, `ensure.mjs` escribe el sentinel `~/.claude/engines-build/<engine>.installed`
   con el hash de versión. Una segunda pasada = no-op.
3. Reporta con honestidad: si la descarga o el build falló, di exactamente qué falló con su salida; no
   declares el motor listo si `locate()` no lo confirma.

Si `$ARGUMENTS` está vacío, corre `node .claude/ensure.mjs --help` y lista los motores disponibles.

Nunca instales un motor pesado nuevo por iniciativa propia: el alcance lo marca la petición y la
confirmación del usuario (restricción + comprobar-primero).
