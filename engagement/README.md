# Engagement Scope

## Setup

1. Copia `scope.json.example` a `scope.json`
2. Lista SOLO hosts propios y autorizados por escrito
3. Guarda y confirma

## Rules

- **Sin scope.json**: Solo localhost (127.0.0.1, ::1) y redes privadas (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) están permitidas
- **Con scope.json**: Agrega hosts específicos explícitamente autorizados
- **Nunca** listes hosts de terceros, dominios públicos o servicios externos
- El kernel **inward-only** prevalece siempre — no hay excepciones

## Example

```json
{
  "targets": ["localhost", "127.0.0.1", "myapp.local", "dev.myapp.internal"],
  "authorized_by": "usuario",
  "note": "solo mi propia app"
}
```

Nota: `scope.json` (sin .example) es gitignored y lo creas vos.
