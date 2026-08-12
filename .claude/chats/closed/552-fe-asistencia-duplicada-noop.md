# 552 — "Mi Asistencia" standalone vs. tab "Mis Salones": ¿agrega mal o falta selector?

> **Repos afectados**: `educa-web`
> **Plan**: `.claude/plan/audit-estudiante-navegacion-2026-08.md` (hallazgo `estudiante-audit-asistencia-duplicada`)
> **Creado**: 2026-08-12 · **Estado**: ✅ cerrado (no-op).
> **MODO SUGERIDO**: `/investigate`
> **exclusive**: `false`
> **modules**: `asistencia` (`estudiante/attendance` standalone + tab embebido en `estudiante/classrooms`)
> **touches**: ninguno — investigación + verificación en vivo, sin cambios de código.

## Contexto

Hallazgo del audit funcional F1 (`estudiante-audit-asistencia-duplicada.md`): con el estudiante de prueba de esa sesión (1 solo curso) no se podía confirmar si `/intranet/estudiante/asistencia` ("Mi Asistencia" standalone) agrega asistencia de todos los cursos en una sola tabla o si le falta el selector de curso que sí tiene el tab de "Asistencia" dentro de "Mis Salones". Pregunta abierta, no bug confirmado.

## Investigación (lectura de código)

- El selector de curso en el standalone **ya existe** (`student-attendance.component.ts:57-67`), condicionado a `@if (cursoOptions().length > 1)`. Viene del commit `22ebf782` ("feat(intranet): connect cursos, salones and asistencia views — P83 F5"), fechado **2026-07-08** — más de un mes antes del audit que generó este hallazgo. El audit lo vio "sin selector" simplemente porque el estudiante de prueba tenía 1 solo curso y el `@if` lo ocultaba.
- Ninguna de las dos vistas agrega asistencia de varios cursos en una tabla: ambas piden datos **por horario** (`getMiAsistencia(horarioId)`). El diseño siempre fue "por curso", nunca "agregado".
- Diferencia real de alcance entre ambas vistas (no es bug, es diseño):
  - Standalone: `cursoOptions()` lista **todos** los horarios del estudiante (`getMisHorarios()`, sin filtrar por salón), deduplicados por `cursoId-salonId`.
  - Tab embebido: `cursosForSelectedSalon` (`estudiante-salones.store.ts:79-86`) lista solo los cursos **del salón que se abrió**.
  - El tab siempre renderiza su `p-select` (`student-attendance-tab.component.html:3`, sin condicional); el standalone lo oculta cuando queda 1 sola opción tras el dedup.

## Verificación en vivo

FE (`ng serve :4201`) + BE (`dotnet run :5139`) levantados localmente. Login vía switcher como admin `CODE CLAUDE` → `/intranet/ver-como/estudiante` → estudiante real **ALBINES MENDIETA JEREMY** (DNI 78080883, salón `1RO SECUNDARIA A`, curso `Biología` con 2 horarios — martes con un profesor, viernes con otro).

- **Mi Asistencia (standalone)**: sin selector visible — confirmado el mecanismo de dedup: los 2 horarios de "Biología" colapsan a 1 sola opción (`cursoId-salonId` igual en ambos), `cursoOptions().length === 1` → `@if` oculta el `p-select`. Auto-selecciona el único curso. Stats en 0 / "No hay registros de asistencia" (el estudiante no tiene asistencia cargada, no relacionado al selector).
- **Mis Salones → tab Asistencia**: `p-select` visible con la única opción "Biología" — confirma que el tab **no** deduplica-oculta, siempre muestra el selector. Mismo resultado vacío de datos.
- No se encontró un estudiante con 2 cursos **distintos** (no duplicados) en los datos de prueba disponibles para ver el selector con 2+ opciones reales en pantalla, pero el mecanismo de show/hide y el alcance global-vs-por-salón quedaron confirmados en vivo, no solo por lectura de código.

## Conclusión

El hallazgo original (falta de selector / posible agregación incorrecta) **no aplica al código actual** — el selector ya existe, el diseño es consistente ("por curso" en ambas vistas), y el comportamiento observado en el audit (sin selector) fue un efecto esperado del `@if (length > 1)` con un estudiante de 1 solo curso, no un bug. Cierra como no-op, igual que `polish-W21-appendto-calendars.md` (brief 188).

## Cierre (2026-08-12)

Sin cambios de código — no hay commit de `fix`. Se actualiza el plan (`audit-estudiante-navegacion-2026-08.md`) marcando este ítem como cerrado no-op. Servidores de dev (FE/BE) detenidos tras la verificación.
