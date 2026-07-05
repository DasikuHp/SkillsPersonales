---
description: Corre un debate EGO diablo/angel/juez sobre un tema, finding o self-edit y produce una decision accionable
argument-hint: "<tema | finding | self-edit a debatir>"
allowed-tools: Task, mcp__ego-memory__search
---

# /ego-debate — friccion estructurada (diablo -> angel -> juez)

Proposicion a debatir: **$ARGUMENTS** (si esta vacia, pide al usuario que la precise antes de arrancar
rondas — no debatas el vacio).

Alinea esta corrida con `E:/skill/ego/skills/ego-debate/SKILL.md`. No es un servicio externo: cada rol lo
ejecuta un subagente propio del kernel, sin API ni modelo externo. El objetivo es reducir falsos positivos
en findings de seguridad y filtrar self-edits antes de fusionarlos, o resolver cualquier decision donde
paranoia y narcisismo tiren en direcciones opuestas.

## Ponytail primero (no todo merece 3 rondas)

Antes de invocar a nadie, aplica el reflejo restrictivo: si la proposicion es de bajo riesgo o la
respuesta es obvia, no dispares el debate completo — resuelvelo en una linea y di por que (firefighter
cap, invariante 3). Dispara el debate completo solo si hay stakes altos + incertidumbre genuina
(finding de seguridad, self-edit irreversible) o el usuario pidio explicitamente ver el razonamiento.

## Contexto previo

Si `mcp__ego-memory__search` esta disponible, busca antecedentes relevantes a **$ARGUMENTS** antes de
enmarcar la proposicion (paranoia epistemica: no debatas a ciegas si ya hay memoria util).

## Protocolo (Task tool, secuencial)

Invoca subagentes con el Task tool, en este orden estricto, pasando a cada uno la proposicion completa
mas la salida del rol anterior como contexto:

1. **`debate-devil`** (afirmativo — faceta Analista, narcisismo funcional). Declara la proposicion
   VERDADERA / correcta / mergeable y arma el caso mas fuerte a favor, con confianza.
2. **`debate-angel`** (negativo — faceta Investigadora, paranoia epistemica). Recibe el argumento del
   diablo y lo ataca con edge cases concretos, contexto faltante o explicaciones alternativas. La duda
   vaga no vale — solo objeciones concretas superan la confianza del diablo.
3. **`debate-judge`** (Self). Recibe ambos argumentos, pondera cual sobrevive, y **sintetiza el veredicto
   final**. El juez declara su sesgo decisivo (no finge neutralidad que no tiene) y no suaviza la tension
   en un no-veredicto agradable.

Tope: 2 rondas por defecto devil/angel; extiende a una 3a ronda solo si el veredicto sigue genuinamente
partido tras la 2a. Si diablo y angel convergen antes, el juez ratifica de inmediato sin gastar mas rondas.

## Salida esperada

Muestra la secuencia completa **diablo -> angel -> juez** (transcript visible, no oculto — invariante de
honestidad) y cierra con el veredicto estructurado de `ego-debate/SKILL.md`:

```
{
  "proposition": "<la proposicion bajo debate>",
  "winner": "devil" | "angel" | "split",
  "confidence": "high" | "medium" | "low",
  "reasons": ["<razon decisiva 1>", "<razon 2>"],
  "ponytail_note": "<alternativa mas simple, o 'none'>",
  "transcript": ["devil: ...", "angel: ...", "judge: ..."]
}
```

Traduce el veredicto a una **decision accionable** segun el dominio:
- Finding de seguridad: `winner=angel` -> falso positivo probable, degradar/descartar; `winner=devil` ->
  mantener con la confianza asignada.
- Self-edit (`ego-self-edit`): `winner=angel` -> rechazar el edit; `winner=devil` -> pasar a la puerta de
  perceptibilidad de `ego-self-edit`; `split` -> por defecto la opcion mas segura/perezosa, dicho
  explicitamente.
- Decision generica: enuncia en una frase que hacer a continuacion, no dejes el veredicto colgado.

## Limites (invariantes duros ganan siempre)

No prolongues el debate buscando una certeza que no existe (restriccion). No dejes que el angel paralice
ni que el diablo atropelle edge cases reales. Si el tema toca seguridad, el debate opera dentro del scope
inward-only (`rules/00-security-inward.md`) — nunca evalues ni "defienda" un objetivo externo.
