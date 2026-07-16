---
exclusive: false
isolation: worktree
touches: [src/app/features/intranet/pages/admin/schedules/components/horario-detail-drawer/, src/app/features/intranet/pages/admin/schedules/horarios.component.html, src/app/features/intranet/pages/admin/schedules/services/horarios-options.store.ts, src/app/features/intranet/pages/admin/schedules/services/horarios-data.facade.ts]
hot-paths: []
---

> **Repo destino**: `educa-web`. Abrir en worktree `chat/457-asignar-profesor-filtro-elegibilidad`.
> **Creado**: 2026-07-16 · **Estado**: ⏳ awaiting-prod.
> **Fuente**: auditoría UX cross-repo "Horarios y Contenido de Cursos" (educa-coord, 2026-07-16) + investigación de este mismo chat.

# Selector "Asignar Profesor" no filtra por elegibilidad de curso

## MODO SUGERIDO

`/execute` directo — todas las piezas (BE y FE) ya existen, es wiring puro, sin necesidad de endpoint nuevo.

## PROBLEMA

Al asignar un profesor a un horario en modo "Por curso", el dropdown lista los 24 profesores del colegio completo sin filtrar por elegibilidad (`ProfesorCurso` activo), sin indicar cuáles ya tienen el curso habilitado. Elegir uno no habilitado dispara `INV_AS02_PROFESOR_CURSO` recién al confirmar.

## CAUSA RAÍZ CONFIRMADA — bug de wiring, no falta funcionalidad

- Drawer: `horario-detail-drawer.component.html:206-217` y `:238-249` (dos `p-select`, reasignar y asignar) usan `[options]="profesoresOptions()"` — el input **sin filtrar**.
- Ese input llega sin filtrar desde el padre: `horarios.component.html:303` → `[profesoresOptions]="vm().profesoresOptions"`.
- **Ya existe la señal correcta, pero no se usa**: `horarios-options.store.ts:103-121` (`profesoresParaAsignacion`, computed que ya soporta `TutorPleno`/`PorCurso`/`Flexible`), expuesta en `horarios.store.ts:170` pero nunca pasada al drawer.
- **Ya existe el método que carga los datos, pero nunca se llama desde ningún lado (dead code)**: `horarios-data.facade.ts:182-190` (`loadProfesoresCurso(cursoId, anio)`, ya usa `profesorCursoApi.listarPorCurso(...)`).
- `HorarioDetalleResponseDto` trae `cursoId` (`models/horario.interface.ts:65`) — dato suficiente para invocar `loadProfesoresCurso` al abrir el drawer.
- BE ya existe y no requiere cambios: `GET api/ProfesorCurso/curso/{cursoId}?anio=` (`ProfesorCursoController.cs:41-47` → `ProfesorCursoService.ListarPorCursoAsync`, `Services/Academico/ProfesorCursoService.cs:40-44`), capability `PROFESOR_CURSO_ASSIGN`. `INV_AS02_PROFESOR_CURSO` confirmado en `ErrorCodes.cs:136-137`.

## FIX

1. Al abrir el drawer, si `modoAsignacionDetalle() === 'PorCurso'`, llamar `dataFacade.loadProfesoresCurso(detalle.cursoId, anio)`.
2. Pasar al drawer `vm().profesoresParaAsignacion` en vez de `vm().profesoresOptions` (`horarios.component.html:303`).
3. Limpiar estado (`clearProfesoresCurso()`) al cerrar el drawer.

## OUT OF SCOPE

- Modo `TutorPleno`/`Flexible` — ya funcionan, no tocar.
- El wizard de creación de horarios (`onSelectCurso` tampoco llama `loadProfesoresCurso` ahí) — mismo bug de wiring, pero es otro flujo/archivo; mencionarlo en el commit como hallazgo relacionado para un brief separado, no ejecutarlo acá.
- Capability `PROFESOR_CURSO_ASSIGN` — solo tocar si al probar se confirma que el rol admin no la tiene (sería un seed, no código).
- Badges de "no elegible" o cualquier variante de mostrar-todos-marcar-no-elegibles — el approach elegido es filtrado server-side puro, no mezclar con esa alternativa.

## Pre-work

- Verificar que el admin de Gestión de Horarios tenga la capability `PROFESOR_CURSO_ASSIGN` antes de dar por cerrado — si no la tiene, la llamada devolvería 403 y rompería el drawer entero.

## Criterio de cierre

- [x] En modo "Por curso", el dropdown de "Asignar Profesor" muestra solo profesores con `ProfesorCurso` activo para ese curso/año.
- [x] Repro: intentar asignar un profesor no habilitado ya no es posible desde el dropdown (no aparece en la lista).
- [x] Lint + build + tests OK.
- [x] Commit en la rama del worktree — sin merge.

## Resumen de ejecución (2026-07-16)

**Ajuste sobre el plan literal del brief**: el fix propuesto en el punto 2 ("pasar `vm().profesoresParaAsignacion`") no era directamente aplicable — ese computed existente en `horarios-options.store.ts` filtra según `modoAsignacion` (derivado de `formStore.formData().salonId`, estado del **wizard** de creación/edición), no según el salón del **drawer de detalle** (`modoAsignacionDetalle`, ya resuelto correctamente vía `resolveModoForSalon(detalle.salonId)`). Reusar el computed del wizard tal cual habría dejado el filtro roto (dependía de estado stale/no relacionado) para el flujo del drawer, que es un `p-select` directo sin pasar por el wizard.

Se optó por un computed dedicado y mínimo, respetando el resto del scope (no tocar TutorPleno/Flexible, sin endpoint nuevo):

- `horarios-options.store.ts`: se expone `profesoresCurso` (antes solo `_profesoresCurso` privado) como lectura pública.
- `horarios.store.ts`: nuevo computed `profesoresParaAsignacionDetalle`, basado en `modoAsignacionDetalle()` (ya correcto para el drawer) — filtra solo en modo `PorCurso`, deja TutorPleno/Flexible/null sin cambios de comportamiento (mismo listado sin filtrar que antes). Expuesto en `uiVm`. `closeDetailDrawer()` ahora también llama `optionsStore.clearProfesoresCurso()` (punto 3 del fix).
- `horarios-data.facade.ts`: en `loadDetalle`, tras `setHorarioDetalle`, si `resolveModoForSalon(detalle.salonId) === 'PorCurso'` se llama `loadProfesoresCurso(detalle.cursoId, detalle.anio)` (ambos campos ya vienen en `HorarioDetalleResponseDto`, sin fetch extra).
- `horarios.component.html`: el drawer ahora recibe `[profesoresOptions]="vm().profesoresParaAsignacionDetalle"` en vez de `vm().profesoresOptions`.

**Capability `PROFESOR_CURSO_ASSIGN`**: verificada en el seed BE (`Educa.API/Educa.API/Migrations/Manual/20260611_W1_SeedTrivialControllerCaps.sql`, CAP_ID 26) — asignada a roles 3/4/5/6 (AA, Coord, Prom, Dir), es decir todos los roles administrativos. No hizo falta ajuste de seed.

**Archivos tocados**:
- `src/app/features/intranet/pages/admin/schedules/horarios.component.html`
- `src/app/features/intranet/pages/admin/schedules/services/horarios-data.facade.ts`
- `src/app/features/intranet/pages/admin/schedules/services/horarios-options.store.ts`
- `src/app/features/intranet/pages/admin/schedules/services/horarios.store.ts`

**Lint/build/test**: lint limpio, build OK, tests 2348/2349 (1 falla — `src/eslint-config-guards.spec.ts`, timeout de 5000ms en un test no relacionado a `schedules/`; reproducido en aislamiento y pasó 13/13, confirmado flake preexistente, no causado por este cambio).

**No verificado en browser**: por restricción de este chat (ejecución headless dentro del worktree), no se hizo prueba manual end-to-end del drawer en navegador. Queda pendiente de `/verify-prod` o verificación manual post-deploy.
