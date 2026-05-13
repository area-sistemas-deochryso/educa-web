---
description: Modo Preguntar/Decidir — frenar, formular la pregunta y pedir decisión al usuario.
---

# Modo: Preguntar / Decidir

**Objetivo**: cuando hay una decisión no trivial o ambigüedad real, frenar y pedir input claro. **No** implementar mientras tanto.

## Cuándo entro en este modo

- Hay ≥ 2 caminos válidos con tradeoffs reales.
- El plan choca con una regla del proyecto (`.claude/rules/` si existe).
- Falta contexto que sólo tiene el usuario (intención de producto, prioridad).
- Un cambio propuesto tiene blast radius alto o es difícil de revertir.

## Qué hago

- Formular **una** pregunta concreta (o un set pequeño y relacionado).
- Listar 2-3 opciones con pros/contras reales (no strawmen).
- Dar mi recomendación explícita con razón.
- Referenciar reglas/decisiones relevantes que acotan el espacio.

## Qué NO hago

- Hacer suposiciones y seguir implementando.
- Preguntar cosas que se responden leyendo el código (`rules/`, `decisions/` si existen) — primero resolver con `/investigate`.
- Hacer preguntas abiertas tipo "¿qué pensás?" sin opciones concretas.
- Hacer una batería larga de preguntas; 1-3 máximo por turno.

## Formato de salida

```markdown
## Pregunta
<una línea clara>

## Opciones
- **A — <nombre corto>**: <descripción> · Pros: ... · Contras: ...
- **B — <nombre corto>**: ... · Pros: ... · Contras: ...

## Recomendación
<A|B|C> porque <razón>.

## Contexto relevante
- Regla aplicable: <link si existe>
- Decisión previa: <link si existe>
```

## Bloque visual de cierre

Cerrar **siempre** con este bloque (después de un `---`) para que la decisión sea scannable:

```markdown
---

## TL;DR
- **Pregunta**: <una línea>
- **Recomiendo**: <opción> · porque <razón corta>
- **Pendiente**: tu confirmación

| Opción | Cuándo | Cuánto | Pros | Contras |
|---|---|---|---|---|
| A — <nombre> | <ahora/después> | <esfuerzo> | ... | ... |
| B — <nombre> | <ahora/después> | <esfuerzo> | ... | ... |
```

Reglas del bloque:

- **TL;DR**: 3 líneas. En `/ask` "Pendiente" es siempre tu confirmación — la pregunta existe porque no puedo decidir solo.
- **Tabla**: obligatoria si hay ≥2 opciones. Columnas adaptables (cuándo/cuánto/pros/contras es el default; reemplazar por contexto/blast-radius/reversibilidad si encaja mejor).

## Después de recibir decisión

- Si queda en plan o abre un ADR, escribirlo antes de ejecutar (ver `/adr`).
- Luego cambiar a `/design` o `/execute` según corresponda.
