---
description: Modo Partir catálogo — fragmentar un archivo de referencia gigante en una carpeta con índice y sub-archivos navegables.
---

# Modo: Partir catálogo

**Objetivo**: tomar un archivo de referencia inflado (`business-rules.md` 1600 ln, `design-system.md` 900 ln, etc.) y partirlo en una carpeta `<nombre>/` con un `README.md` índice + sub-archivos por eje, **sin reescribir contenido**: relocalizar + agregar navegación + actualizar cross-refs. Complementa [`/context-budget`](context-budget.md): ese saca el archivo del prefijo fijo; este hace que el `Read` posterior cueste 200 líneas y no 1600.

## Cuándo aplica

- Archivo de `.claude/` (regla, contexto, doc) que pasó las ~300 líneas y es un **catálogo** (lista de invariantes, tokens de diseño, endpoints, patrones) — no una regla cohesiva.
- Ya está clasificado como on-demand (o lo va a estar). Partir algo que igual se carga siempre no ahorra nada.
- Si el archivo es largo pero **cohesivo** (un solo tema, se lee de corrido): NO partir — duele pero partirlo rompe el hilo. Reportar y parar.

## Elegir el eje de partición (en orden de preferencia)

1. **Por dominio / grupo de invariantes** — `business-rules/{attendance,grading,schedules,enrollment}.md`. El mejor: el hook on-demand se vuelve quirúrgico.
2. **Por componente / familia** — `design-system/{buttons,tables,dialogs,tokens}.md`.
3. **Por fase / etapa** — si el catálogo describe un pipeline.
4. **Alfabético / numérico** — último recurso, solo si no hay eje semántico. Avisar que es subóptimo.

Si dudás entre dos ejes → preguntar antes de partir. El eje define los hooks; elegirlo mal obliga a re-partir.

## Reglas de la partición

- **No renumerar anclas**: `INV-12`, `B7`, error codes, IDs estables se quedan como están. Si estaban dispersos, el índice mapea `INV-12 → grading.md`.
- **Cada sub-archivo ≤ ~300 líneas**. Si un eje sigue gordo, sub-partir ese.
- **Header en cada sub-archivo**: 2-3 líneas de scope + link de vuelta al `README.md`.
- **Frontmatter `description:`** si el sub-archivo es a su vez referenciable on-demand.
- **No tocar el contenido** salvo: arreglar links internos rotos por el movimiento, y quitar duplicación literal entre sub-archivos (mover a un `_shared.md` o al README).
- **Verificación de no-pérdida**: `wc -l` del original ≈ suma de los sub-archivos + README (± lo deduplicado). Reportar el delta.

## El `README.md` índice

- Una línea por sub-archivo: `- [grading.md](grading.md) — INV-12..18, escalas, redondeo, períodos`.
- Si hay anclas estables dispersas, tabla `ancla → archivo`.
- Nota de 2 líneas: "este catálogo se lee on-demand; el hook en `CLAUDE.md` apunta acá".

## Actualizar referencias

1. `grep -rn "<nombre-viejo>.md" .claude/` (y `~/.claude/` si aplica) → reapuntar cada cita al sub-archivo correcto, o al `README.md` si la cita es genérica.
2. **En `CLAUDE.md`**: la línea de índice on-demand del archivo viejo se reemplaza por las de los sub-archivos, cada una con su hook fino. Si quedan demasiadas, una línea al `README.md` + el árbol vive ahí.
3. Borrar el archivo viejo solo después de confirmar que no quedan refs colgadas.

## Qué NO hago

- Reescribir, resumir o "mejorar" el contenido — esto es relocalización, no edición.
- Partir un archivo cohesivo solo porque es largo (ver "Cuándo aplica").
- Renumerar invariantes / tokens / error codes.
- Tocar código fuente.
- Cambiar el estado on-demand/always-on de nada (eso es `/context-budget`).

## Entregable

1. **Propuesta de eje + estructura de carpeta** (qué sub-archivos, qué va en cada uno). Mostrarla y esperar confirmación ANTES de mover.
2. La carpeta `<nombre>/` con `README.md` + sub-archivos.
3. Cross-refs actualizadas (incluido el índice on-demand en `CLAUDE.md`).
4. Verificación de no-pérdida (líneas antes ≈ después).
5. Commit aparte. Si el repo linkea `~/.claude/`: commit + push, re-correr el script de links si se tocó `CLAUDE.md`.

## Override por proyecto

`<repo>/.claude/commands/split-catalog.md` puede fijar el eje preferido del proyecto (ej. educa: siempre por grupo de INV), el umbral de líneas, o nombrar catálogos que nunca se parten.
