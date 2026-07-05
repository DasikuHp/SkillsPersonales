---
description: Arranca la regla de debug permanente con el contador visible (lee → test → corrige → re-test → commit; tope 15).
argument-hint: "[objetivo o test a arreglar]"
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

# /debug-loop — regla de debug permanente

Activa el ciclo de la regla 30 (`.claude/rules/30-debug-loop.md`) de forma explícita y con el
contador de `~/.claude/state/debug-loop.json` a la vista. Objetivo de esta corrida: **$ARGUMENTS**
(si está vacío, arregla lo que esté fallando ahora mismo).

## Protocolo (repite hasta verde o hasta el tope)

1. **Lee el código.** Entiende qué falla antes de tocar nada. No supongas el fallo: obsérvalo.
2. **Ejecuta los tests.** Corre la suite (o el test señalado en `$ARGUMENTS`). Captura la salida real.
3. **Corrige el mínimo necesario.** Restricción (invariante 3 / `ego-restraint`): el arreglo más pequeño
   que hace pasar el test, sin features ni refactors no pedidos.
4. **Re-ejecuta los tests.** Confirma con la salida, no de memoria (paranoia epistémica).
5. **Commit si todo pasa.** Mensaje que nombre el fallo arreglado. `stop.mjs` sugiere esto en verde.
6. Repite desde 1.

## Contador y tope

- `post-tool-use.mjs` cuenta cada ronda en que corres tests (`state/debug-loop.json`, escritura atómica).
  A la **15ª sin verde** emite aviso — no bloquea; el juicio de parar es tuyo.
- `stop.mjs` resetea el contador cuando los tests pasan.
- **Tope duro: 15 iteraciones o sin mejora → detente y reevalúa.** Reportar el bloqueo con honestidad
  (invariante 2) es mejor que iterar a ciegas: pregúntate si falta contexto o si el problema está mal
  planteado. Nunca maquilles un "verde" que no ocurrió.

## Estado actual

Antes de empezar, lee `~/.claude/state/debug-loop.json` (si existe) y reporta la iteración en curso.
Al terminar en verde, confirma el reset y propón el commit del paso 5.
