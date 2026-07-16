---
exclusive: false
isolation: worktree
touches: [src/app/features/intranet/pages/profesor/schedules/, src/app/features/intranet/pages/estudiante/schedules/, src/app/features/intranet/pages/profesor/cursos/components/attendance-registration-panel/, src/app/features/intranet/pages/admin/schedules/components/schedule-weekly-grid/]
hot-paths: []
---

> **Repo destino**: `educa-web`. Abrir en worktree `chat/453-asistencia-fe-ux-popover-atajo-columnas-vacias`.
> **Creado**: 2026-07-16 · **Estado**: ⏳ pendiente.
> **Fuente**: auditoría UX cross-repo "Horarios y Contenido de Cursos" (educa-coord, 2026-07-16) + investigación de este mismo chat.

# Asistencia FE: popover al click de clase + atajo a fecha válida + columnas de día vacías

## MODO SUGERIDO

`/execute` — causa raíz y approach ya definidos, con 2 decisiones de producto ya tomadas (ver abajo).

## ALCANCE

### 1. Click en clase de "Mi Horario" salta directo a Asistencia sin detalle

**Archivos**: `profesor-horarios.component.ts` (líneas 251-255, `verAsistencia`), `.html` (líneas 80/140, los clicks), `profesor-horarios.helpers.ts` (`HorarioBlock`, `buildBlocks`, líneas 4-17/49-85, `getNextOccurrence` líneas 116-143).

**Fix**: reemplazar el click directo por un **popover/dialog liviano** anclado al bloque clickeado. **No reusar `CourseDetailsModalComponent`** (`components/schedule/course-details-modal/`) — es de otra ruta (`/intranet/horarios`, cross-role) con datos placeholder hardcodeados, no aplica acá. Contenido del popover: nombre de curso, horario, salón, cantidad de estudiantes, y 3 accesos rápidos — Asistencia, Contenido, Calificaciones. **"Tema de semana" queda fuera de alcance** — ese campo no existe en `HorarioProfesorDto`, traerlo requeriría trabajo de BE no autorizado en este brief.

Al navegar a Asistencia desde el popover, pasar la fecha de la próxima ocurrencia válida de ese horario (reusar la lógica de `getNextOccurrence`, líneas 116-143), **no** `hoy` — esto corrige de paso la causa por la que el warning de fecha aparece incluso sin que el profesor haya elegido mal la fecha.

**Popover — comportamiento**: cierra con click-outside o Escape (sin botón "Cerrar" explícito obligatorio). En mobile, donde ya hay cards con más espacio, mantener navegación directa tal cual (no aplicar el popover ahí).

### 2. Sin atajo a fecha válida en Asistencia

**Archivos**: `attendance-registration-panel.component.ts` (línea 90-94 `fechaFueraDeHorario()`, línea 57 `selectedDate`, líneas 72-75 `onDateSelect()`), `.html` (banner líneas 36-43). `diaSemanaEsperado` (input, línea 45, convención `Date.getDay()`) ya disponible.

**Decisión ya tomada**: el botón busca la fecha válida **más cercana en cualquier dirección** (antes o después de la fecha elegida), no solo hacia adelante.

**Fix**: agregar botón dentro del banner ("Ir a fecha válida") que calcule la fecha más cercana (adelante y atrás) cuyo `getDay()` coincida con `diaSemanaEsperado()`, actualice `selectedDate` y dispare `onDateSelect()`. Extraer la lógica en un helper bidireccional (distinto del `getNextOccurrence` existente, que solo mira hacia adelante — no modificarlo, crear uno nuevo o parametrizarlo).

### 3. Columnas de día vacías sin mensaje

**Profesor y Estudiante — mismo fix, dos archivos** (implementaciones independientes, no compartidas — confirmado, no unificarlas en este brief, sería refactor aparte):
- `profesor-horarios.component.html`: vista mobile (líneas 70-74) ya tiene mensaje "Sin clases este día" con ícono `pi-calendar-times`; vista desktop (líneas 118-166, `day-column` 120-165) no tiene nada cuando `getBlocksForDay(dia.value)` está vacío. Agregar el mismo mensaje/ícono ahí.
- `estudiante-horarios.component.html`: mismo patrón exacto (mensaje en mobile línea 48, nada en desktop `day-column` línea 91/`day-grid` línea 97) — mismo fix, copy idéntico al de profesor.

**Admin — sub-punto aparte, alcance distinto** (no unificar con lo anterior): `schedule-weekly-grid.component.html`, granularidad por celda-hora, no por columna-día completa. Cuando `isAdmin()` es `false`, una celda vacía queda en blanco sin indicador (hoy solo `isAdmin()===true` muestra ícono `pi-plus` para crear horario). Agregar un computed `isDayEmpty(dia)` (no existe hoy) y mostrar un indicador a nivel de columna cuando el día completo está vacío y `!isAdmin()`.

**No tocar**: `horarios-weekly-view.component.ts`/`.html` — confirmado código muerto (sin referencias reales en rutas), no vale la pena actualizarlo ni borrarlo en este brief.

## OUT OF SCOPE

- Unificar las 3 implementaciones de grilla semanal en un componente compartido — deuda técnica real pero es refactor arquitectónico aparte.
- Traer "tema de semana" desde backend.
- Reusar/rehabilitar `CourseDetailsModalComponent`.
- `campus-navigation/schedule-panel.component.ts` — no relevado, no confirmado si tiene el mismo problema, fuera de los 3 hallazgos de este brief.

## Criterio de cierre

- [x] Click en clase de "Mi Horario" (desktop) abre popover con detalle + 3 accesos, no navega directo.
- [x] Botón "ir a fecha válida" funcional en Asistencia, busca en ambas direcciones.
- [x] Columnas de día vacías muestran "Sin clases este día" en desktop (profesor + estudiante) y en admin cuando `!isAdmin()`.
- [x] Lint + build + tests OK.
- [x] Commit en la rama del worktree — sin merge.

## Resumen de cierre (2026-07-16)

**Nota de setup**: el brief solo existía como archivo `??` (untracked) en el repo principal `educa-web` — no se había materializado en este worktree. Se recreó en `.claude/chats/running/` a partir de esa fuente antes de empezar (no se tocó nada fuera del worktree).

### Punto 1 — Popover en "Mi Horario" (desktop)
- `profesor-horarios.component.ts`: agregado estado `selectedBlock`, handler `onBlockClick()` (toggle de `p-popover` estilo PrimeNG, mismo patrón que `user-profile-menu.component.ts`), y 3 navegaciones (`irAAsistencia`, `irAContenido`, `irACalificaciones`).
- `irAAsistencia()` reusa `getNextOccurrence()` (ahora exportado desde `profesor-horarios.helpers.ts`) para pasar `fecha` (yyyy-mm-dd, via nuevo helper `formatDateISO`) como queryParam, en vez de `hoy`.
- Mobile no se tocó: `verAsistencia(block)` sigue navegando directo, sin popover.
- `teacher-attendance.component.ts`: ahora lee también el queryParam `fecha` (además de `horarioId`), llama `asistenciaFacade.loadRegistro(fecha, horarioId)` directo y pasa `initialFecha` al panel de registro para que el datepicker arranque en esa fecha (no en hoy).
- `attendance-registration-panel.component.ts`: nuevo input `initialFecha` (string ISO), aplicado vía `effect()` sin pisar ediciones posteriores del usuario en el datepicker.

### Punto 2 — Atajo bidireccional a fecha válida
- Nuevo archivo `attendance-registration-panel.helpers.ts` con `findNearestValidDate(fromDate, targetDayOfWeek)` — busca la fecha más cercana en cualquier dirección (no reutiliza ni modifica `getNextOccurrence`, que solo mira hacia adelante).
- Nota técnica: con semana de 7 días nunca hay empate real entre distancia adelante/atrás (offsets 1-6 siempre suman 7) — la guarda `<=` en el código es defensiva, no resuelve un caso real. Documentado en el JSDoc.
- Botón "Ir a fecha válida" agregado dentro del banner de advertencia existente (`fecha-fuera-horario-warning`).
- Test unitario nuevo: `attendance-registration-panel.helpers.spec.ts` (4 casos: mismo día, más cercano adelante, más cercano atrás, distancia asimétrica).

### Punto 3 — Columnas de día vacías
- `profesor-horarios.component.html`/`.scss` y `estudiante-horarios.component.html`/`.scss`: agregado `.day-empty-state` (ícono `pi-calendar-times` + "Sin clases este día") en la vista desktop cuando `getBlocksForDay(dia.value).length === 0`, mismo copy que la vista mobile ya existente. Implementaciones independientes, sin unificar (confirmado por el brief).
- `schedule-weekly-grid.component.ts` (admin): nuevo computed `isDayEmpty(dia)`. En `.html`, ícono `pi-calendar-times` con tooltip junto al label del día cuando `!isAdmin() && isDayEmpty(dia.value)`.

### Decisiones de diseño no cubiertas explícitamente por el brief
1. **Calificaciones no soporta deep-link por `horarioId`**: a diferencia de Asistencia y Contenido, `profesor-calificaciones.component.ts` no lee `ActivatedRoute` — no preselecciona el curso. Se pasa `horarioId` como queryParam de todos modos (inofensivo, por consistencia con los otros dos accesos) pero hoy no tiene efecto ahí. No se amplió su alcance por no estar en `touches:` del brief.
2. **Popover con `p-popover` de PrimeNG** (no un dialog custom): se siguió el patrón ya existente en `user-profile-menu.component.ts` (mismo componente `Popover`, `appendTo="body"`, cierre nativo con click-outside/Escape) en vez de crear un componente popover propio desde cero — más consistente con el codebase y cumple el requisito "cierra con click-outside o Escape" sin código extra.
3. **Timing de `initialFecha` en el panel de asistencia**: se aplica una sola vez por valor nuevo (guardado en `lastAppliedInitialFecha`) para no pisar ediciones del usuario en el datepicker si vuelve a navegar desde el popover con la misma instancia de componente ya montada.

### Validación
- `bun run lint` → OK, sin hallazgos.
- `bun run build` → OK (SSR + prerender de 9 rutas estáticas).
- `bun run test` → 227 archivos / 2353 tests, todos en verde.
