# 762 — FE: P105 D1 F4 — Pestaña Salón del hub (profesor y estudiante)

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1-F4 · **Fase**: F4 · **Creado**: 2026-10-03 · **Estado**: ✅ cerrado local 2026-10-03
> **Origen**: brief 761 (F3b profesor, commit `6419d11c`, integrado en `main` local sin push) · diseño en briefs 753 y 755
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso" (fila F4). El plan se lee solo por intención y decisiones.
> **depends_on**: F1a ✅ (brief 756). F3 y F3b ya integradas; la verificación en vivo de 757–761 sigue en `awaiting-prod/`.
> **MODO SUGERIDO**: `/investigate` → `/design` → `/execute` → `/validate`
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: `shared/components/curso-hub-tabs` (agregar la pestaña `salon` a `CURSO_HUB_TABS`), `shared/helpers/curso-hub-link.helpers.ts` (`CursoHubTabPath`), `intranet.routes.ts` (hija `salon` de ambos hubs), `pages/profesor/cursos/curso-hub/**` y `pages/estudiante/cursos/curso-hub/**` (un componente por rol). Lectura de `pages/profesor/classrooms/**` y `pages/estudiante/classrooms/**`. **No toca los modales de curso ni las páginas de Salones.**
> **hot-paths**: ninguno

## OBJETIVO
Sumar al hub de curso la pestaña **Salón** para profesor y estudiante: un **resumen del salón del par** más un **enlace** a la página de Salones de su rol. Es la última pestaña de las 5 del hub y desbloquea F5a (tarjeta por par y redirect legacy), que depende de F2, F3 y F4.

## DECISIONES VALIDADAS (no re-preguntar)
- **Resumen + enlace.** Embeber el contenido completo del salón queda como evolución posterior (decisión 2026-10-02, brief 753).
- **Salón es del par, no de la franja.** A diferencia de Contenido, Calificaciones, Asistencia e Información, esta pestaña **no cambia al cambiar de franja** y nunca agrega entre franjas. Curso y Salón ya viven en el encabezado del hub (también son del par).
- Pestañas como **rutas hijas** con URL propia; el query `horarioId` sobrevive al cambio de pestaña (lo hace `CursoHubTabsComponent` con `queryParamsHandling: 'merge'`).
- Un shell por rol; hereda la autorización de su página de Cursos vía `permissionPath`. Sin seed en BE.
- Solo FE. Los modales de curso siguen intactos hasta F6.
- El hub es solo para profesor y estudiante (admin y apoderado quedan fuera).
- **Fuera de D1**: el futuro del menú «Mi Asistencia» del estudiante y el del menú de asistencia del profesor.

## PRE-WORK
- Leer `chats/awaiting-prod/761-…md` y `760-…md` (patrón de pestaña y razón de diseño) y el commit `6419d11c`.
- Leer `shared/components/curso-hub-shell/curso-hub-shell.base.ts`, `curso-hub-context.service.ts` y `curso-hub-tabs.component.ts` (tabla `CURSO_HUB_TABS` y `cursoHubTabsFor`).
- Investigar **qué muestran hoy** `pages/profesor/classrooms/profesor-salones.component.*` y `pages/estudiante/classrooms/` y de dónde sale ese dato (facade/store/API). De eso depende qué cabe en el «resumen» sin pedir datos nuevos.
- Reglas de UI: `reference/design-system.md`, `a11y.md`, `route-permission-sharing.md` (el enlace apunta a otra página con su propia capability).

## DECISIÓN DE DISEÑO OBLIGATORIA
1. **Qué es el «resumen».** Definir el contenido mínimo útil de la pestaña por rol (p. ej. salón, grado/sección, tutor, cantidad de estudiantes, lo que ya exponga el dato existente). Preferir lo que ya se carga; **no abrir endpoint nuevo** sin avisar (este brief es solo FE).
2. **Dueño de la carga.** Salón es del par: la clave es `(cursoId, salonId)`, no `horarioId`. Decidir si el shell o la pestaña pide el dato, y cómo evitar recargarlo al cambiar de franja (misma clave de par → no recargar). Mantener el patrón: el shell es dueño del reset al salir del hub.
3. **Orden de la pestaña.** El plan habla de 5 pestañas; hoy son Contenido, Calificaciones, Asistencia, Información. Decidir dónde va Salón en `CURSO_HUB_TABS` (afecta el orden visible y los specs de ambos shells).
4. **Enlace.** Destino y query hacia `profesor/salones` y `estudiante/salones` (¿admiten preselección por salón?). Qué pasa si el usuario **no tiene capability** de esa página: ocultar el enlace o mostrarlo deshabilitado. Confirmar contra `route-permission-sharing.md`.
5. **Estados.** Cargando, vacío y error con `app-empty-state`, igual que las otras pestañas.

## ALCANCE (estimado, re-verificar contra el código)
- 2 componentes nuevos (`profesor-curso-hub-salon` y `estudiante-curso-hub-salon`) + specs. Si el resumen es idéntico entre roles, evaluar un componente presentacional compartido en `shared/components` y dos contenedores finos.
- `CURSO_HUB_TABS`: nueva fila `salon` con `roles: ['profesor', 'estudiante']`; `CursoHubTabPath` suma `'salon'`.
- 2 rutas hijas en `intranet.routes.ts` (una por hub), con `title` propio.
- Specs a actualizar: `curso-hub-tabs.component.spec.ts` (`cursoHubTabsFor`), `profesor-curso-hub.component.spec.ts` y `estudiante-curso-hub.component.spec.ts` (hoy esperan las etiquetas `['Contenido','Calificaciones','Asistencia','Información']`).

## IMPLEMENTATION DETAIL (ADR-0006)
- **Estado actual de `main`** (`6419d11c`):
  - `CURSO_HUB_TABS` tiene 4 filas; ambas con `roles: ['profesor','estudiante']`. El comentario de la tabla ya anticipa «F4 agrega Salón».
  - `CursoHubTabPath = 'contenido' | 'calificaciones' | 'asistencia' | 'informacion'`.
  - Los dos hubs tienen rutas hijas `contenido`, `calificaciones`, `asistencia` (el profesor la tiene desde 761) e `informacion`.
  - `CursoHubContextService.slot()` expone la franja resuelta (`HorarioProfesorDto`, que trae `cursoId`, `salonId`, `salonDescripcion`). El par también está en los params de la ruta.
- **Shell base** (`CursoHubShellBase`): desde 761 tiene `hasUnsavedChanges()` (hook, `false` por defecto), un `edu-confirm-dialog` en la plantilla y `selectionResetKey`. Ambos shells proveen `EduConfirmationService`. Salón no necesita nada de esto.
- **Patrón de pestaña** (760/761): `effect` sobre el id relevante + `untracked`; la vista descarta datos cuyo identificador no coincide con el actual; estados con `app-empty-state`; botón de refresco con `eduTooltip` y `data-info-anchor` en los controles.
- **Specs de referencia**: `estudiante-curso-hub-asistencia.component.spec.ts` y `profesor-curso-hub-asistencia.component.spec.ts` (mock del facade por signal, `CursoHubContextService` simulado con un signal `slot`, `overrideComponent` con template vacío).

## APRENDIZAJES TRANSFERIBLES (de 761)
- **Compartido con el otro rol**: cualquier cambio en `CursoHubShellBase` o `CursoHubHeaderComponent` toca profesor y estudiante a la vez; el shell del estudiante no tiene mocks de asistencia, así que sus specs son sensibles a nuevas dependencias del base.
- **`ngModel` con el mismo valor no se re-escribe**: para revertir un control hay que hacer `NgModel.control.setValue(...)`. Recrear con `@for` dispara el warning NG0956.
- **Estilos `.p-*` son código muerto**: edu-ui ya no emite clases `.p-tabs`, `.p-tabpanel`, etc.; no copiar los `::ng-deep` de la página `teacher-attendance`. Además `:host ::ng-deep { … }` anidado rompe el parser CSS de jsdom (ruido en los tests).
- **Edición de archivos**: en el worktree, `Edit`/heredocs con `python` funcionaron. Cuidado: `attendance-course.*.ts` están en CRLF; abrir con `newline=''` al parchar con Python. Para archivos nuevos usar `Write`.
- **Worktree nuevo sin `node_modules`**: `bun install --frozen-lockfile` tarda ~110 s; lanzarlo en segundo plano al crear el worktree. El worktree se crea a mano (`git worktree add -b chat/762-… WT/educa-web/762-…`), se registra en `.claude/.locks/worktrees.json` (ignorado por git) y el brief se copia a su `running/`.
- **Validación**: `bun run lint` pasa con 4 warnings preexistentes ajenos (`correlation-request-section.spec`, `usuarios-data.facade` ×3). `bun run build` pasa. Vitest de `pages/profesor`, `pages/estudiante` y `shared` es el alcance mínimo (742 verdes al cierre de 761).
- **Cierre**: copiar el brief a `awaiting-prod/` dentro del worktree y borrar el original sin trackear de `main`. Integrar con `/wt-merge` y limpiar con `/wt-clean`; `git branch -d` exige que `main` ya tenga el merge. Commit sin `Co-Authored-By`.
- **Pendiente de revisar en vivo (760/761)**: cómo se ven los `stat-card` de la pestaña del estudiante y el aviso de «Cambios sin guardar» con un par multi-franja.

## FUERA DE ALCANCE
- Tarjeta por par y redirect legacy (F5a), migración de consumidores y `returnTo` (F5b), retirada de modales (F6).
- Embeber el contenido completo del salón; cambiar las páginas `profesor/salones` o `estudiante/salones`.
- Guard de salida para asistencia editada (back/forward, salir del hub): quedó como candidato aparte tras 761.
- Decidir el futuro de los menús de asistencia.
- Cambios de BE.

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@data/@config/...`, `logger` de `@core/helpers`, `takeUntilDestroyed`, sin `console.*`. UI en español, código en inglés. Archivos ≤ ~300 ln. `profesor/` no importa de `estudiante/` (lint de capas); los imports cross-role existentes llevan `eslint-disable` con razón.

## VALIDACIÓN FINAL
- [ ] `bun run lint`, `bun run build` y `vitest run` de `pages/profesor`, `pages/estudiante` y `shared` en verde.
- [ ] Deep link a `…/cursos/:cursoId/:salonId/salon` (ambos roles) carga tras recarga; cambiar de franja **no** recarga ni cambia el resumen.
- [ ] El enlace lleva a la página de Salones del rol y respeta su autorización.
- [ ] Verificación en vivo con «ver como» (par multi-franja). En prod solo lectura; mutar solo en local con BBDD de prueba (`rules/browsing.md`).

## CRITERIOS DE CIERRE
- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `awaiting-prod/` o `closed/` en el mismo commit que el código.
- [ ] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`feat(intranet): P105 D1 F4 — hub Salón tab (profesor and estudiante)`

## PENDIENTES HEREDADOS
- Verificación en vivo de 757, 758, 759, 760 y 761 (en `awaiting-prod/`).
- Push a `main` = deploy a prod: no sin autorización. `main` va 5 commits adelante de `origin/main`.
- Decidir el futuro de los menús de asistencia (estudiante y profesor) ahora que F3 y F3b están integradas; se decide mejor cuando F4 esté lista y se vea qué queda redundante.
- Candidato a brief aparte: guard de salida (`canDeactivate`) para asistencia editada sin guardar.
- Agregar el trabajo derivado al final de la cola del maestro si aplica (hoy la cola está vacía).

## DISEÑO DEL CHAT (ADR-0006 — detalle descubierto, no vuelve al plan)
- **Datos**: la pestaña no pide nada. El slot ya trae `salonDescripcion` y `cantidadEstudiantes` (el BE los calcula con la misma fuente que `Profesor/mis-estudiantes`); `ProfesorFacade.loadData()` ya trae la tutoría. El resumen se deriva de `vm().horarios` filtrando por `salonId` (`buildCursoHubSalonSummary`, `shared/helpers/curso-hub-salon.helpers.ts`).
- **Salón es del par**: `computed` del par `(cursoId, salonId)` y del resumen con `equal` estructural (`isSameCursoHubSalonSummary`), así cambiar de franja no re-emite. Spec por identidad de referencia en ambos roles.
- **Tutoría (solo profesor)**: sale de `vm().salones` (sin filtro de periodo), no de `salonesConEstudiantes` (filtra por regular/verano).
- **Componente compartido** `app-curso-hub-salon-summary` (presentacional) + dos contenedores finos (`profesor-curso-hub-salon`, `estudiante-curso-hub-salon`). Usa `app-kpi-stats`, `app-curso-chip` y tokens (sin hex).
- **Orden**: `salon` va al final de `CURSO_HUB_TABS` (5ª pestaña); `CursoHubTabPath` suma `'salon'`.
- **Enlace**: `/intranet/<rol>/salones?horarioId=<slot>` (ambas páginas ya abren el diálogo del salón con ese query). Se oculta (no se deshabilita) sin `SALONES_PROFESOR_PAGE_VIEW` / `SALONES_ESTUDIANTE_PAGE_VIEW`. Las rutas hijas heredan `permissionPath` del padre; sin seed en BE.
- **Estados**: cargando/error los resuelve el shell; la pestaña solo agrega un `app-empty-state` defensivo.
- **Extra no pedido**: chips «Tus cursos en este salón» que enlazan al hub de cada curso del mismo salón (el actual queda marcado).

## RESULTADO (2026-10-03)

> **Validación prod**: ⏳ pendiente desde 2026-10-03

- **Alcance**: pestaña Salón de profesor y estudiante (ruta hija `…/salon`). Cierra las 5 pestañas del hub y desbloquea F5a (tarjeta por par y redirect legacy: depende de F2, F3 y F4).
- **Validación local**: lint 0 errores (4 warnings preexistentes) ✅ · build ✅ · vitest `pages/profesor` + `pages/estudiante` + `shared` 732 verdes ✅.
- **Doc-watch**: `context/domain.md` tenía las líneas del hub desactualizadas («hoy solo shell + selector de franja», «en construcción»); corregidas en este commit. `reference/testing.md` y coord `invariants/estructura-academica.md` descartados (falso positivo por glob ancho).
- **Pendiente en vivo**: deep link `…/cursos/:cursoId/:salonId/salon` (ambos roles) carga tras recarga; cambiar de franja no recarga ni cambia el resumen; el enlace lleva a Mis Salones y abre el salón; sin la capability el enlace no aparece; chips de otros cursos navegan a su hub; «ver como» con par multi-franja. En prod solo lectura (`rules/browsing.md`). Sigue pendiente la verificación en vivo de 757–761.
- **Derivados**: F5a (tarjeta por par y redirect legacy) ya es elegible. Decidir el futuro de los menús de asistencia (estudiante y profesor) ahora que se ve qué queda redundante.

## CIERRE
Pedir feedback con `/feedback`.
