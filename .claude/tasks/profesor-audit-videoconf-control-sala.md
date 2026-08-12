<!-- created: 2026-08-11 -->

# profesor-audit-videoconf-control-sala

> **Origen**: F1 audit funcional del plan [`audit-profesor-navegacion-2026-08.md`](../plan/audit-profesor-navegacion-2026-08.md).
> **Severidad**: 🔴 (seguridad/supervisión de menores — mismo eje que [`estudiante-audit-videoconf-estado-vivo.md`](estudiante-audit-videoconf-estado-vivo.md), visto ahora desde el lado del profesor).
> **Pre-requisito**: mismo que el brief de estudiante — confirmar con el proveedor de videoconferencia qué expone su API antes de diseñar el control.

## Reproducción

1. Loguear como profesor, ir a "Más" → "Videoconferencias" (`/intranet/videoconferencias`).
2. Ver 2 tarjetas de curso, cada una con botón **"Unirse a Sala"** en verde.
3. No se encontró ningún botón, toggle o indicador de "abrir sala" / "cerrar sala" / "sala en vivo" en la vista del profesor — el botón para unirse es idéntico al que ve el estudiante.

**Actual**: el brief de estudiante ([`estudiante-audit-videoconf-estado-vivo.md`](estudiante-audit-videoconf-estado-vivo.md)) dejó como pregunta abierta #3 "¿hay algún control existente del lado del profesor para 'cerrar sala', o solo se autogestiona por horario?" — **respuesta confirmada: no existe ningún control visible.** El profesor tiene exactamente la misma superficie que el estudiante: un botón siempre-verde sin noción de horario ni de presencia.

**Por qué importa (perspectiva de rol)**: la responsabilidad de que una sala de videollamada con menores esté supervisada recae naturalmente en el profesor, no en el estudiante. Sin ningún control del lado docente, la única barrera posible sería un fix puramente cosmético en la pantalla del estudiante (deshabilitar el botón fuera de horario) — lo cual no resuelve el caso real de un estudiante entrando a destiempo mientras el profesor tampoco tiene forma de cerrar la sala activamente.

## Preguntas a resolver antes de implementar (comparten investigación con el brief de estudiante)

1. ¿El proveedor de videoconferencia expone algún control de "el host cierra la sala para todos" o "expulsar participantes"?
2. Si no lo expone: ¿tiene sentido un control interno de Educa (ej. un toggle "sala habilitada" que el profesor activa manualmente antes de la hora de clase y desactiva al terminar), independiente de lo que haga el proveedor?
3. ¿Quién define la ventana de "horario válido para unirse" — es configurable por el profesor o es fija según el horario del curso?

## Próximo paso decidido (2026-08-12)

Mismo `/investigate` que [`estudiante-audit-videoconf-estado-vivo.md`](estudiante-audit-videoconf-estado-vivo.md) — una sola investigación en `educa-web`, no dos.

## Criterio de cierre

- Las mismas 3 preguntas respondidas en conjunto con el brief de estudiante (no duplicar la investigación).
- Decisión de diseño tomada con el equipo correspondiente (no unilateral de FE) sobre qué control mínimo se construye para el profesor.

## Out-of-scope

- Cambios al SDK/proveedor de videoconferencia en sí.
- El fix cosmético del botón en la pantalla de estudiante — eso vive en el brief de estudiante; este brief es sobre la capacidad de control que falta del lado profesor.
