<!-- created: 2026-08-11 -->
<!-- closed: 2026-08-13 -->

# profesor-audit-resumen-asistencia-en-cero

> **Origen**: F1 audit funcional del plan [`audit-profesor-navegacion-2026-08.md`](../plan/audit-profesor-navegacion-2026-08.md).
> **Severidad**: 🟡 (dato de gestión docente incorrecto — el profesor podría creer que no ha tomado asistencia cuando sí lo hizo).
> **Estado**: ✅ Cerrado — ver DIAGNÓSTICO REAL abajo.

## DIAGNÓSTICO REAL

No era un bug de agregación ni de filtro de fechas. Confirmado por SQL (chat `499`, `Educa.API`): el curso del repro no tenía **ningún** registro real guardado en `AsistenciaCurso` para el rango consultado — 0 filas. El tab "Registrar" mostraba "Total: 20, Presentes: 20" porque `AsistenciaCursoService.ObtenerPorFechaAsync` rellena `Estado = "P"` por defecto para cada estudiante sin registro individual guardado, indistinguible en la UI de un guardado real. El tab "Resumen" agregaba correctamente sobre datos que nunca existieron — de ahí el 0%.

**Fix**: `Educa.API` (chat `499`) expone `tieneRegistros: boolean` a nivel de clase en el DTO del endpoint de fecha. `educa-web` (chat `554`) consume el flag mostrando un tag "Sin guardar" en el tab "Registrar" cuando `tieneRegistros === false`, para que el profesor distinga un borrador sin guardar de un registro real — sin cambiar el comportamiento de guardado ni el agregado de "Resumen" (que ya era correcto).

## Reproducción

1. Loguear como profesor, ir a "Mi Seguimiento" → "Mi Asistencia" (`/intranet/profesor/asistencia`) → seleccionar curso "QA E2E Curso Prueba".
2. Tab "Registrar" → fecha 10/08/2026 (lunes, día válido del horario del curso): se ve asistencia ya tomada, **Total: 20, Presentes: 20**.
3. Tab "Resumen" → rango 01/08/2026 al 11/08/2026 (incluye el 10/08) → click "Buscar".
4. Ver: **Clases: 0, Presentes: 0, Faltas: 0, Asistencia: 0%** — para los 20 estudiantes, cada uno con "Total: 0" y "% Asist.: 0.0%".

**Actual**: el tab "Resumen" no refleja la clase que el tab "Registrar" confirma que ya existe dentro del mismo rango de fechas consultado. Mismo patrón que [`estudiante-audit-rendimiento-sin-datos.md`](estudiante-audit-rendimiento-sin-datos.md) (dos vistas del mismo dato, una en 0 y otra no) — no se determinó todavía si es un filtro de fecha roto en FE o un problema de agregación en BE.

## Componente probable

Componente de gestión de asistencia por curso (`/intranet/profesor/asistencia`), tabs "Registrar" y "Resumen". Revisar si "Resumen" usa el mismo formato/zona horaria de fecha que "Registrar" al construir el rango de búsqueda enviado al backend.

## Criterio de cierre

- Confirmado si es bug de FE (filtro/rango de fechas mal armado) o de BE (endpoint de resumen no agregando el registro).
- Con los mismos datos de esta sesión, "Resumen" muestra al menos 1 clase y 20 presentes para el rango 01-11/08/2026.

## Out-of-scope

- El resumen agregado a nivel de "Resumen de Salones" (`/intranet/profesor/final-salones`) — ese usa aprobados/desaprobados de notas, no de asistencia; no se probó si tiene el mismo bug.
