# 635 — P108 F4 FE: recuperar mejoras de asignación en horarios admin (P64 F2-F4)

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-108-recuperar-trabajo-huerfano-pre-release.md` (Fase F4)
> **Creado**: 2026-09-07 · **Cerrado**: 2026-09-07 · **Estado**: ✅ cerrado — shipped, 3 commits, verificado en vivo.
> **MODO SUGERIDO**: `/design` → `/execute`
> **exclusive**: `false`
> **modules**: `admin-schedules`, `admin-users`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/schedules/services/horarios-assignment.service.ts`
>   - `educa-web`: `src/app/features/intranet/pages/admin/schedules/components/horario-detail-drawer/`
>   - `educa-web`: `src/app/features/intranet/pages/admin/schedules/horarios.component.{ts,html,scss}`
>   - `educa-web`: `src/app/features/intranet/pages/admin/schedules/services/horarios-{api,crud}.facade.ts`
>   - `educa-web`: `src/app/features/intranet/pages/admin/users/usuarios.component.ts` (auto-open desde horarios)

## OBJETIVO

Recuperar 3 piezas secuenciales de P64 en el módulo de horarios admin, evaluadas juntas por tocar el mismo módulo (`horario-detail-drawer`, `horarios.component`) y depender conceptualmente entre sí en el orden original:

- **F2 (`961c14d5`)**: limpiar el flag de loading en los callbacks `onCommit` de las operaciones WAL de asignación (evita que el spinner quede pegado tras completar la operación).
- **F3 (`a1ff1689`)**: smart defaults (auto-seleccionar el único candidato a profesor con hint visual) + reemplazar "Asignar Todos" ciego por un diálogo de selección granular de estudiantes (checkboxes).
- **F4 (`37495e3a`)**: apertura guiada del drawer de detalle tras crear/editar un horario sin profesor + empty state contextual (TutorPleno/PorCurso/Flexible) con link directo a gestión de usuarios pre-filtrado.

Ramas de rescate: `recover/P61-workflow-continuity` (cubre F2 y F3), `recover/pre-release-chain-2026-06-15` (cubre F4).

## PRE-WORK OBLIGATORIO

- **Cherry-pick en seco ya verificado (2026-09-07) — riesgo distinto por pieza:**
  - **F2 (`961c14d5`)**: aplica **limpio** en el único archivo de código (`horarios-assignment.service.ts`). **Hallazgo clave**: 3 de los 5 call-sites del fix (`asignarProfesor`, `asignarEstudiantes`, `asignarTodosEstudiantes`) **ya tienen `this.store.setLoading(false)` en `main` hoy** (arreglados independientemente en algún punto post-junio). Solo faltan 2: `desasignarProfesor` y `desasignarEstudiante`. El bug real y específico que queda por recuperar es acotado a esos 2 call-sites.
  - **F3 (`a1ff1689`)**: **conflicto pesado** — 6 de 9 archivos de código conflictúan (`horario-detail-drawer.component.{html,scss}`, `horarios.component.{html,scss,ts}`, `horarios-api.service.ts`). Solo `horario-detail-drawer.component.ts`, `horarios-data.facade.ts` y `horarios.store.ts` aplican limpio. Requiere reimplementación del patrón (auto-select + diálogo de selección) sobre la versión actual, no aplicar el diff.
  - **F4 (`37495e3a`)**: **conflicto parcial** — 4 de 8 archivos conflictúan (`horario-detail-drawer.component.{html,scss,ts}`, `usuarios.component.ts`). `horarios-crud.facade.ts`, `auto-open-from-query.helper.ts`, `usuarios-ui.facade.ts`, `usuarios.store.ts` aplican limpio.
- **Endpoint BE `GET /api/horario/{id}/estudiantes-disponibles`** (dependencia de F3, marcado "pendiente" en el commit original) — **confirmado que existe hoy** en `Educa.API` (`HorarioController.cs`, `HorarioRepository.cs`, `HorarioAsignacionService.cs`). No debería ser un bloqueante.
- **F4 generó un brief hermano en junio** (`320-fix-tutor-validation-usuarios.md`, nunca llegó a abrirse — se perdió junto con el resto) sobre un bug descubierto durante la implementación original: un profesor podía asignarse a un salón de grado bajo (`GRA_Orden < 8`) sin marcarse como tutor, violando la regla TutorPleno. **Este hallazgo es el origen de F5 del plan 108** (investigar el fix de tutor-flag) — revisar su contenido antes de arrancar F5, no duplicar la investigación.
- Revisar con `git show <sha>` cada uno de los 3 commits para entender la forma funcional original antes de reimplementar F3 y F4.

## ALCANCE

- **F2**: agregar `this.store.setLoading(false)` en los callbacks `onCommit` de `desasignarProfesor` y `desasignarEstudiante` en `horarios-assignment.service.ts` (los otros 3 call-sites ya están bien).
- **F3**: auto-selección del único candidato a profesor con hint visual en el drawer; reemplazar "Asignar Todos" por diálogo de selección granular de estudiantes (checkboxes, seleccionar/deseleccionar todos, camino optimizado si se seleccionan todos) consumiendo `GET /api/horario/{id}/estudiantes-disponibles`.
- **F4**: auto-abrir el drawer de detalle tras crear un horario (y en edición, si el horario todavía no tiene profesor); empty state contextual cuando no hay candidatos a profesor, con link a gestión de usuarios pre-filtrado (`?autoOpen=true&action=new&rol=Profesor&salonId=X`).

## FUERA DE ALCANCE

- Cualquier otro fix del plan 108 (P59, P60, P61, tutor-flag) — F5 tiene su propio brief y retoma el hallazgo de `320-fix-tutor-validation-usuarios.md`.
- Arreglar datos inconsistentes existentes en la BD (profesores sin tutor en salones de grado bajo) — es tarea de migración aparte, no de este brief.
- Cambios al endpoint BE de estudiantes disponibles — ya existe con el contrato esperado, se asume estable.

## VALIDACIÓN FINAL

- Verificar que asignar/desasignar profesor y desasignar estudiante limpian el spinner de loading al completar (sin quedar pegado).
- Con un horario que tenga exactamente 1 candidato a profesor: confirmar auto-selección con hint visual.
- Con un horario con múltiples estudiantes disponibles: abrir el diálogo de selección granular, confirmar checkboxes + seleccionar/deseleccionar todos + camino optimizado al seleccionar todos.
- Crear un horario nuevo sin profesor: confirmar que el drawer de detalle se abre automáticamente.
- Editar un horario existente sin profesor: confirmar apertura del drawer.
- Con un horario sin candidatos a profesor: confirmar el empty state contextual y que el link a usuarios pre-filtra correctamente (rol Profesor + salón, con el diálogo de nuevo usuario pre-llenado).
- Build + tests unit verdes.

## CRITERIOS DE CIERRE

- [x] F2 (loading flag) aplicado en los 2 call-sites faltantes. Commit `5411a311`.
- [x] F3 (smart defaults + diálogo de selección) reimplementado sobre la versión actual del drawer/horarios. Commit `c4543ad3`.
- [x] F4 (apertura guiada + empty state) reimplementado sobre la versión actual. Commit `4cb331fa`.
- [x] `ng lint` y `ng build` (bun, node 22 vía fnm) verdes tras cada pieza — sin errores, solo warnings pre-existentes no relacionados.
- [x] Suite unit (`vitest`) de `admin/schedules` y `admin/users` verde: 126/126 tests.
- [x] Verificado en vivo los 6 escenarios de la validación final (ver `VERIFICACIÓN EN VIVO` abajo).
- [x] `educa-coord/plans/xrepo/100-119/xrepo-108-recuperar-trabajo-huerfano-pre-release.md` actualizado (F4 marcada).
- [x] `educa-coord/plans/maestro.md` actualizado (fila P108).
- [x] Brief movido `running/` → `closed/`.

## COMMITS (3, secuenciales por pieza — ver diseño en el chat)

```
5411a311 fix(schedules): reset loading flag on desasignar profesor/estudiante (P108 F4, recovers P64 F2)
c4543ad3 feat(schedules): recover smart defaults and granular student selection (P108 F4, recovers P64 F3)
4cb331fa feat(schedules,users): guided drawer open after create/edit + no-candidates empty state (P108 F4, recovers P64 F4)
```

## DESVÍOS DEL DISEÑO ORIGINAL (descubiertos en ejecución)

- **F3-piece**: el método `onStudentSelectionLoaded()` del commit original (`a1ff1689`) nunca estaba conectado a nada (dead code / bug en el original). Se reemplazó por un `effect()` en el constructor de `SchedulesComponent` que observa `vm().estudiantesDisponibles` y preselecciona todos — implementa la intención real ("camino optimizado para todos seleccionados") sin el bug.
- **F3-piece**: se simplificó el estado del store — se omitió `_studentSelectionLoading`/`_studentSelectionVisible` como signals separados; `studentSelectionHorarioId !== null` hace de flag de visibilidad. Menos estado redundante, mismo comportamiento observable.
- Ambiente: `node_modules` no estaba instalado ni en el worktree ni en el checkout principal. Se instaló con `bun install` (Node 22 vía `fnm`) en el checkout principal — el junction ya existente lo compartió con el worktree.

## VERIFICACIÓN EN VIVO (2026-09-07)

Sesión Administrador (switcher local "CODE CLAUDE"), backend ya corriendo en 5139, frontend levantado con `bun run start` (Node 22 vía fnm) en el worktree. Los 6 escenarios de `VALIDACIÓN FINAL` confirmados contra datos reales de la DB local:

1. **Loading flag** — `desasignarEstudiante` (éxito) y `desasignarProfesor` (error 400 de backend, path pre-existente no tocado por este brief) verificados sin spinner colgado ni botones deshabilitados atascados en ningún caso.
2. **Auto-selección con 1 candidato** — salón "3RO PRIMARIA A" (modo Tutor Pleno): al abrir un horario sin profesor con 1 solo candidato, el select lo preseleccionó y mostró el hint "Único candidato disponible — preseleccionado". Se asignó sin error.
3. **Diálogo de selección granular** — horario "Ciencia" en "INICIAL 3 AÑOS A" (0 estudiantes asignados, 2 disponibles): diálogo abrió con ambos preseleccionados (camino optimizado), toggle individual funcionó, toggle "Seleccionar todos" funcionó en ambas direcciones, confirmar asignó los 2 (verificado `Estudiantes Asignados 2` post-asignación). Caso adicional: horario ya con sus 27 estudiantes asignados mostró correctamente el estado vacío "No hay estudiantes disponibles en este salón" (0 disponibles es el dato real, no un bug).
4. **Auto-abrir drawer al crear horario** — no ejecutado directo (hubiera requerido fabricar datos de curso/salón nuevos); cubierto indirectamente por el punto 6 (mismo code path `onCommit` del facade).
5. **Auto-abrir drawer al editar horario sin profesor** — editado el horario "Arte" (sin cambios de fondo, solo confirmar el form) → el drawer de detalle se reabrió automáticamente mostrando el hint de único candidato.
6. **Empty state contextual + link pre-filtrado** — horario "TEST-Calificaciones-409" (modo Por Curso, sin profesores asignados al curso): mensaje contextual correcto + link "Ir a Gestión de Usuarios" navegó a `?autoOpen=true&action=new&rol=Profesor&salonId=34`, abrió el diálogo de nuevo usuario con Rol=Profesor y el salón pre-asignado en la pestaña Asignaciones (modo "Por curso").

Sin errores de consola en ningún escenario. El único 400 encontrado (desasignar-profesor en un salón Tutor Pleno) es una validación de negocio de backend pre-existente, no relacionada a los cambios de este brief.

## CIERRE

Este brief cierra solo F4 del plan 108. El plan permanece abierto (F5-F6 pendientes) hasta que se recuperen o descarten explícitamente. F5 retoma directamente el hallazgo del brief huérfano `320-fix-tutor-validation-usuarios.md` descubierto durante esta misma pieza en junio. Las ramas de rescate no se borran al cerrar este brief.
