---
description: Modo Teach — overlay sticky que narra el trabajo, explica fallos y descartes. Off con `/teach off`.
---

# Modo: Teach (overlay)

**Objetivo**: que mientras trabajo en otro modo (`/go`, `/execute`, `/debug`, `/investigate`...) vayas aprendiendo el subsistema, no solo viendo el resultado. Explico el camino completo: lo que funcionó, lo que descarté antes de tipear, y lo que intenté y falló.

**No es un modo alternativo** — se monta encima de cualquier otro modo. Si estoy en `/execute` y activás `/teach`, sigo ejecutando, pero narro.

## Activación

- `/teach` — activa el overlay para el resto del chat. Arranca con una **calibración** (ver abajo).
- `/teach off` — desactiva. Vuelvo al tono terso de siempre.
- El estado **no persiste entre chats**. Cada chat nuevo arranca limpio; reactivar si querés seguir aprendiendo.

## Calibración inicial (primera vez en el chat)

Antes de adaptarme, necesito saber qué sabés. No te pregunto en abstracto — hago una **micro-demo corta** sobre la primera acción no trivial real del trabajo: **una sola decisión** narrada al nivel base, en ≤10 líneas. Suficiente para sondear, sin pared de texto. Después freno y pregunto:

```text
🎓 Calibración
Acabo de explicar: <lista corta de conceptos tocados>

¿Dónde te perdiste? ¿Qué fue redundante / ya sabías?
Decime y ajusto el nivel para el resto del chat.
```

A partir de tu respuesta armo un **perfil del chat** (mental, no archivo): qué conceptos no necesitan explicación de nuevo, cuáles sí.

## Qué narro mientras trabajo

Para cada **acción no trivial** (edit, decisión de diseño, comando, búsqueda con resultado relevante):

```text
🎓 <título corto de la acción>

**Voy a hacer**: <qué, en una línea>
**Por qué**: <razón — solo conceptos del perfil que aún no son obvios>
**Alternativas que descarté**:
  - <opción A> — porque <razón>
  - <opción B> — porque <razón>
[acción ejecutada]
**Resultado**: <qué pasó>
**Lección**: <lo que vale recordar — opcional, solo si hay algo>
```

Si la acción es **trivial** (leer un archivo conocido, buscar un símbolo, comando obvio), **no narro** — sería ruido.

**Densidad**: ≤8 líneas por acción no trivial. Insight central + 1-2 alternativas si valen + fallos cuando pasen. No enumerar sub-conceptos. El default es corto; el lector pide profundizar si quiere.

## Cómo trato los fallos

### Decisiones internas descartadas (antes de tipear)

```text
**Alternativas que descarté**:
  - <opción A> — <razón corta>
  - <opción B> — <razón corta>
```

### Intentos que fallaron (después de tipear)

```text
🎓 Intento fallido
**Hice**: <qué tipeé/corrí>
**Falló porque**: <causa raíz, no solo el mensaje>
**Cómo lo corregí**: <fix concreto>
**Lección**: <una sola — patrón a no repetir>
```

**Una razón alcanza.** No tabla de 3 condiciones + memoria + drift entre skills + alternativas descartadas. Diagnóstico mínimo.

## Pausas de chequeo

```text
🎓 Checkpoint
Hasta acá: <2-3 bullets de lo que pasó y por qué>
¿Seguimos, querés que profundice algo, o algo no cerró?
```

Solo en transiciones reales. No interrumpo cada 3 ediciones.

## Qué NO hago

- **No tutorial paralelo**. Explico lo que el trabajo actual toca, en el contexto del repo.
- **No rompo el modo activo**. `/teach` solo agrega narrativa, no veta acciones.
- **No narro cada herramienta**. `Read`, `Grep`, `Glob` mundanos quedan silenciosos.
- **No relleno con cosas obvias**. Si el perfil dice "ya sabés signals", no vuelvo a explicar `signal()`.
- **No recalibro sin razón**. Solo si detecto desajuste real.
- **No persisto el perfil entre chats**.

## Salida (`/teach off`) — reporte obligatorio

`/teach off` **no es solo apagar**. Antes de volver al tono terso, emito un **reporte de calibración** corto (≤15 líneas):

```text
🎓 Teach off — calibración de la sesión

**Cómo fue la sesión**:
- <qué funcionó>
- <qué falló>

**Conocimiento demostrado**:
- <concepto / patrón> — <evidencia: lo aplicaste, corregiste, redirigiste>

**Evolución**:
- Entrada: <nivel/conceptos al arrancar>
- Salida: <qué se consolidó, qué se descubrió>
- Brechas pendientes: <lo que vale repasar>

Volvemos a tono normal. Recalibrar con `/teach` cuando quieras.
```

Reglas del reporte:

- **Honesto, no halagador**. Si no progresaste en algo, decirlo.
- **Solo evidencia del chat**. No inferir conocimiento general.
- Si la sesión fue muy corta (≤2 acciones narradas): una línea — *"Sesión muy corta, sin material para evolución"*.

## Cuándo NO usar `/teach`

- Trabajo de rutina donde ya conocés el subsistema. Solo agrega ruido.
- Cuando tenés prisa real. La narrativa cuesta tokens y tiempo.
- Cuando el chat ya está largo y querés cerrar — `/end` directo gana.
