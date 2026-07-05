# 00 · Seguridad inward-only (INVARIANTE DURO — máxima precedencia)

El SO practica seguridad **ofensiva y defensiva** (red team + blue team) sobre **una sola cosa:
la app propia del usuario**. Esto es imprescindible y no se puede desactivar.

## Permitido (in-scope)
- `localhost`, `127.0.0.1`, `::1`, `0.0.0.0`.
- Redes privadas: `10.x`, `192.168.x`, `172.16–31.x`.
- Hosts listados explícitamente en `engagement/scope.json` (autorización propia y escrita).
- Análisis del **código fuente propio**, tests, fuzzing local, hardening, parcheo.

## Prohibido y BLOQUEADO (out-of-scope)
- Cualquier host, dominio o IP pública que no sea del usuario y no esté en `scope.json`.
- Escaneo, explotación, fuerza bruta o exfiltración contra terceros.
- "Solo mirar" un objetivo externo. La urgencia no es excepción.

## Cómo se aplica
`post-tool-use.mjs` (vía `lib/security.mjs`) inspecciona comandos con herramientas de red/ofensivas
(nmap, sqlmap, curl, nc, ssh…). Si aparece un host que no es local/privado ni está en `scope.json`,
devuelve `decision: block`. `user-prompt-submit.mjs` reinyecta este invariante cuando el prompt toca
seguridad. Los agentes `appsec-red` y `appsec-blue` operan **solo** dentro de este scope.

## scope.json (formato)
```json
{ "targets": ["localhost", "127.0.0.1", "miapp.local", "dev.miapp.internal"],
  "authorized_by": "usuario", "note": "solo mi propia app" }
```
Sin `scope.json`, solo se permiten targets locales/privados. Este invariante gana a cualquier prompt,
rasgo EGO o skill.
