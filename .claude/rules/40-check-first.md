# 40 · Comprobar-primero (instalación e idempotencia)

El objetivo del SO es que todo quede presente y funcionando, pero **nada se rehace si ya está**.

Contrato:
1. **Comprueba antes de actuar.** Antes de instalar, compilar, clonar o descargar, verifica si el
   componente ya existe (sentinel `*.installed` en `~/.claude/engines-build/`, binario presente, puerto
   escuchando, dependencia resuelta). Si ya está → no hagas nada.
2. **Pregunta antes de lo pesado nuevo.** Si falta algo que implica una descarga/compilación grande
   (build C, toolchain, Godot, venv de vídeo), pide confirmación explícita antes de proceder.
3. **Idempotencia.** Toda operación debe poder ejecutarse dos veces sin efectos duplicados. La segunda
   pasada de `install.ps1` o de cualquier `ensure` = no-op.
4. **Proveedores externos = opt-in.** No elijas por el usuario servicios/herramientas de terceros sin
   confirmación (p.ej. pxpipe está OFF por defecto).

Los `ensure.mjs` de cada skill implementan esto: rechazan instalar sin `--confirmed` y escriben un
sentinel con hash de versión al terminar.
