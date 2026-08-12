<!-- created: 2026-08-11 -->

# estudiante-audit-asistencia-duplicada

> **Origen**: F1 audit funcional del plan [`audit-estudiante-navegacion-2026-08.md`](../plan/audit-estudiante-navegacion-2026-08.md).
> **Severidad**: 🟢 (no observable como bug con los datos de prueba actuales — 1 solo curso — pero es una pregunta abierta de escalamiento).

## Reproducción

1. Loguear como estudiante, ir a "Mi Seguimiento" → "Mi Asistencia" (`/intranet/estudiante/asistencia`). Ver estadísticas (1 presente, 0 tarde, 0 falto, 100%) y tabla con fecha/estado/justificación.
2. Ir a "Mis Salones" → abrir salón → tab "Asistencia". Ver exactamente los mismos números y la misma tabla.

**Actual**: con un solo curso inscripto, ambas vistas muestran datos idénticos — no hay bug visible todavía, pero tampoco selector de curso en la vista standalone ("Mi Asistencia"), mientras que la vista dentro de "Mis Salones" sí tiene un dropdown de curso (aunque con 1 solo curso no se nota).

**Pregunta a validar** (no reproducible con los datos de prueba de esta sesión, requiere un estudiante con 2+ cursos/salones): ¿"Mi Asistencia" standalone agrega la asistencia de todos los cursos del estudiante en una sola tabla, o necesita un selector de curso que hoy no tiene? Si la intención es "vista agregada de todo", está bien así. Si la intención es "por curso", falta el selector que sí existe en la otra vista.

## Componente probable

`pages/estudiante/` — comparar el componente detrás de `/intranet/estudiante/asistencia` (standalone) contra el tab de asistencia embebido en `estudiante/classrooms` (ya referenciado en `intranet-fe-polish-W21.md` como `student-attendance-tab.component`). Si standalone reusa el mismo componente sin pasarle selector de curso, confirmar si es intencional.

## Perspectiva de rol

Bajo impacto directo en el estudiante mientras tenga 1 solo curso (caso típico en primaria temprana con tutoría única). Se vuelve relevante en secundaria, donde un estudiante puede tener varios cursos/profesores y necesitaría distinguir asistencia por materia.

## Criterio de cierre

- Confirmar con un caso de prueba de 2+ cursos si "Mi Asistencia" agrega correctamente o necesita selector.
- Si falta selector: agregarlo, consistente con el que ya existe en el tab de "Mis Salones".
- Si agrega correctamente: no se requiere cambio de código, solo documentar la intención (cerrar como no-op, igual que `polish-W21-appendto-calendars.md` cerró como no-op en el plan hermano).

## Out-of-scope

- Historial de Asistencia biométrica (CrossChex) — es una fuente de datos distinta, ya tiene su propio manejo correcto de estado vacío, no está en cuestión acá.
