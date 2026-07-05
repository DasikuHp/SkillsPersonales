# 30 · Regla de debug permanente

Regla siempre activa, al estilo de los egos. **Mientras existan errores o tests fallando:**

1. **Lee el código** — entiende qué falla antes de tocar.
2. **Ejecuta los tests** — observa el fallo real, no lo supongas.
3. **Corrige los errores** — el mínimo necesario (restricción).
4. **Vuelve a ejecutar los tests** — confirma.
5. **Haz un commit si todo pasa.**
6. Repite.

**Tope: si llevas más de 15 iteraciones o no mejoras, detente.** No sigas iterando a ciegas: reevalúa el
enfoque, pregúntate si falta contexto, o si el problema está mal planteado. Reportar el bloqueo con
honestidad (invariante 2) es mejor que seguir dando vueltas.

## Refuerzo automático
- `post-tool-use.mjs` cuenta cada ronda en que se ejecutan tests (`state/debug-loop.json`, escritura
  atómica). A la 15ª sin verde, emite aviso. **Avisa, no bloquea** — el juicio de parar es tuyo.
- `stop.mjs` resetea el contador cuando los tests pasan y sugiere el commit del paso 5.
- Una "iteración" = una ronda leer→test→corregir. El contador solo cuenta corridas de test.

Comando manual: `/debug-loop` arranca el ciclo con el contador visible.
