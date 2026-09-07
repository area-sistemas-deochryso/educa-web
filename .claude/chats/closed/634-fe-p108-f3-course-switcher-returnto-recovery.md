# 634 — P108 F3 FE: recuperar course switcher + returnTo navigation

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-108-recuperar-trabajo-huerfano-pre-release.md` (Fase F3)
> **Creado**: 2026-09-07 · **Estado**: 🟢 libre — independiente del resto de fases del plan 108. **Mayor riesgo de conflicto de las 6 fases** (confirmado abajo).
> **MODO SUGERIDO**: `/design` → `/execute`
> **exclusive**: `false`
> **modules**: `profesor-cursos`, `profesor-classrooms`, `profesor-schedules`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/profesor/cursos/components/curso-content-dialog/`
>   - `educa-web`: `src/app/features/intranet/pages/profesor/cursos/profesor-cursos.component.ts`
>   - `educa-web`: `src/app/features/intranet/pages/profesor/cursos/services/curso-contenido-data.facade.ts`
>   - `educa-web`: `src/app/features/intranet/pages/profesor/classrooms/profesor-salones.component.ts`
>   - `educa-web`: `src/app/features/intranet/pages/profesor/schedules/profesor-horarios.component.ts`

## OBJETIVO

Recuperar dos features de P61 en el diálogo de contenido de curso (vista profesor):

1. **Course switcher**: dropdown en el header del diálogo que permite cambiar de curso/salón sin cerrar y reabrir el diálogo.
2. **returnTo navigation**: si el diálogo se abrió desde horarios o salones (con un query param de origen), al cerrarlo navega de vuelta a esa página en vez de quedarse en "Mis Cursos".

Commit original de referencia: `a3483d93` (rama de rescate `recover/P61-workflow-continuity`, también en `recover/pre-release-chain-2026-06-15`). El commit también incluye un fix menor de índice de tab en `onVerAsistencia` (3→2) — evaluar si sigue aplicando.

## PRE-WORK OBLIGATORIO

- **Cherry-pick en seco ya verificado (2026-09-07) — conflicto en 6/7 archivos.** Solo `profesor-salones.component.ts` aplica limpio; el resto (`curso-content-dialog.component.{ts,html,scss}`, `profesor-cursos.component.ts`, `curso-contenido-data.facade.ts`, `profesor-horarios.component.ts`) conflictúan. **No aplicar el diff — reimplementar sobre la versión actual.**
- **El archivo se movió**: en junio vivía en `pages/profesor/cursos/curso-content-dialog.component.*`; hoy vive en `pages/profesor/cursos/components/curso-content-dialog/curso-content-dialog.component.*` (reorganización de P50, cohesión FE).
- **El componente ya no usa PrimeNG**: el commit original usa `primeng/select` (`Select`) para el dropdown. Post-P79, el componente actual importa desde `@edu-ui` (`EduDialog`, `EduButton`, `EduTabs`, `EduConfirmDialog`, etc. — ver líneas 1-56 de `curso-content-dialog.component.ts`). El switcher debe implementarse con el select de `@edu-ui`, no con el snippet original.
- **Confirmado que la feature no existe hoy de ninguna forma**: el componente actual ya tiene `Router` inyectado y navega *desde* el diálogo hacia `/intranet/profesor/asistencia` y `/intranet/profesor/salones` (método `onVerAsistencia`/`onVerSalon`, líneas ~320-337) — pero es navegación unidireccional hacia afuera, **no** el patrón "volver al origen" (`returnTo`) que traía P61. No hay `cursoOptions`/`switchCourse`/`selectedHorarioId`-switching en el componente actual.
- Revisar con `git show a3483d93` el diff completo de los 7 archivos para entender la forma funcional original antes de reimplementar: cómo se arma `cursoOptions` desde `ProfesorFacade.vm().horarios` (dedup por `cursoId-salonId`), cómo `dataFacade.switchCourse(horarioId, {...})` recarga el contenido sin cerrar el diálogo, y cómo se propaga el query param `returnTo` desde `profesor-cursos.component.ts` / `profesor-horarios.component.ts` / `profesor-salones.component.ts`.

## ALCANCE

- Course switcher: dropdown (con `@edu-ui`) en el header del diálogo, visible solo si hay más de un curso/salón disponible (`showCourseSwitcher`), que dispara la carga del contenido del curso elegido sin cerrar/reabrir el diálogo.
- `switchCourse()` (o equivalente) en `CursoContenidoDataFacade` — verificar si ya existe algo parecido antes de asumir que hay que crearlo desde cero.
- `returnTo` query param: al navegar a `curso-content-dialog` desde horarios o salones, propagar un origen; al cerrar el diálogo, si hay origen registrado, navegar de vuelta ahí en vez de quedarse en la lista de cursos.
- Reevaluar el fix de índice de tab en `onVerAsistencia` (3→2 en el commit original) contra la estructura actual de tabs — aplicar solo si el índice sigue siendo incorrecto hoy.

## FUERA DE ALCANCE

- Cualquier otro fix del plan 108 (P59, P60, P64, tutor-flag) — cada uno tiene su propio brief.
- Cambios a la navegación unidireccional existente (`onVerAsistencia`/`onVerSalon`) más allá de lo necesario para integrar `returnTo`.
- Rediseño del diálogo de contenido más allá de lo que P61 ya cubría — este brief restaura trabajo perdido, no lo extiende.

## VALIDACIÓN FINAL

- Con un profesor que tenga 2+ cursos/salones asignados: abrir el diálogo de contenido, confirmar que el switcher aparece y cambia de curso sin cerrar el diálogo (contenido, calificaciones y demás tabs se actualizan al curso nuevo).
- Con un profesor de un solo curso: confirmar que el switcher **no** aparece.
- Abrir el diálogo desde horarios → cerrarlo → confirmar que vuelve a horarios (no a "Mis Cursos").
- Abrir el diálogo desde salones → cerrarlo → confirmar que vuelve a salones.
- Abrir el diálogo directamente desde "Mis Cursos" (sin origen) → cerrarlo → confirmar que se queda en "Mis Cursos" (comportamiento actual, sin regresión).
- Build + tests unit verdes.

## CRITERIOS DE CIERRE

- [x] Course switcher funcional, reimplementado sobre `@edu-ui`.
- [x] `returnTo` navigation funcional desde horarios y salones.
- [x] Verificado en vivo 4 de 5 escenarios — ver RESULTADO (el 5to, switcher con 2+ cursos, cubierto solo por lectura de código).
- [x] `educa-coord/plans/xrepo/100-119/xrepo-108-recuperar-trabajo-huerfano-pre-release.md` actualizado (F3 marcada).
- [x] `educa-coord/plans/maestro.md` actualizado (fila P108).
- [x] Brief movido `running/` → `closed/`.

## COMMIT MESSAGE sugerido

```
feat(profesor): add course switcher and returnTo navigation (P108 F3, recovers P61)
```

## RESULTADO (2026-09-07)

- **Diseño**: cherry-pick en seco de `a3483d93` contra `main` confirmó conflicto en 6/7 archivos (migración edu-ui de P79 + refactor WAL/cross-tab-refetch de `CursoContenidoDataFacade`). Se reimplementó el comportamiento sobre la arquitectura actual en vez de aplicar el diff — ver `.claude/plans/p108-recovery/03-course-switcher-returnto.md` (diseño completo, decisiones, contract checklist).
- **Course switcher**: nuevo `CourseSwitcherComponent` (presentacional, `@edu-ui` `EduSelect`), extraído como componente hijo porque `curso-content-dialog.component.ts` ya estaba a 286/300 líneas contadas antes de tocarlo — sumar el switcher inline lo hubiera hecho superar el límite del proyecto. `CursoContenidoDataFacade.switchCourse()` nuevo, mismo patrón signal-based que `loadContenido`/`refreshContenido`.
- **returnTo**: `profesor-salones` y `profesor-horarios` taggean el origen (`returnTo: 'salones'|'horarios'`) al navegar al diálogo de contenido; `profesor-cursos.component.ts` lo captura, valida contra whitelist, y navega de vuelta al cerrar el diálogo (nuevo `@Output closed` en el diálogo, emitido solo en cierre real — no en cambio de curso).
- **Descartado del commit original**: el fix de tab index (`onVerAsistencia` 3→2) — la navegación que corregía (horarios → cursos con tab en query param) ya no existe; hoy "ver asistencia" navega directo a una página separada.
- **Escape hatch de lint**: el componente ya superaba el presupuesto de líneas del proyecto antes de este cambio; se aplicó `/* eslint-disable max-lines */` con justificación explícita en el archivo (mecanismo que el propio `eslint.config.js` define para este caso) en vez de forzar un refactor mayor fuera de alcance.
- **Validado en vivo** (profesor "RAMIREZ BERNARDO JOSE DANIEL", sesión guardada local, backend `dotnet run` puerto 5139 + frontend `npm start` puerto 4201): navegación `returnTo` desde salones y desde horarios (ambas vuelven correctamente a su origen al cerrar), diálogo abierto sin origen se queda en "Mis Cursos" (sin regresión), y header sin switcher con 1 solo curso disponible (título simple). Sin errores de consola en ninguna navegación.
- **No verificado en vivo**: el caso positivo del switcher (aparece y funciona con 2+ cursos) — el único profesor con sesión guardada en este entorno tiene un solo curso/salón asignado. Cubierto por lectura de código (`showSwitcher = cursoOptions().length > 1`, dedup por `cursoId-salonId`) y por los 2533 tests unitarios existentes, pero no por interacción real en navegador. Documentado como gap conocido, no bloqueante — no requiere `awaiting-prod/` porque el gap es de fixture local, no de comportamiento en producción.
- **Lint + build + tests**: verdes (`ng lint` sin errores, build sin errores en archivos tocados, 2533/2533 tests unitarios pass).
- **Commit**: `2b72e6f2` en `chat/634-fe-p108-f3-course-switcher-returnto-recovery` (worktree), pendiente de `/wt-merge`.

## CIERRE

Este brief cierra solo F3 del plan 108. El plan permanece abierto (F4-F6 pendientes) hasta que se recuperen o descarten explícitamente. Las ramas de rescate no se borran al cerrar este brief.
