# 761 — FE: P105 D1 F3b — Pestaña Asistencia del hub (profesor)

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1-F3b · **Fase**: F3b · **Creado**: 2026-10-03 · **Estado**: ✅ cerrado local 2026-10-03
> **Origen**: brief 760 (F3 estudiante, commit `8af52898`, integrado en `main` local sin push) · diseño en briefs 753 y 755
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso" (fila F3). El plan se lee solo por intención y decisiones.
> **depends_on**: 760 integrado en `main`; la verificación en vivo de 757–760 sigue en `awaiting-prod/`
> **MODO SUGERIDO**: `/investigate` corto → `/design` → `/execute` → `/validate`
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: `shared/components/curso-hub-tabs` (agregar `'profesor'` a `roles` de la pestaña `asistencia`), `intranet.routes.ts` (hija `asistencia` de `profesor/cursos/:cursoId/:salonId`), `pages/profesor/cursos/curso-hub/**` (componente nuevo), `AttendanceCourseFacade` (solo añadir si hace falta). **No toca los modales de curso ni la página `profesor/asistencia`.**
> **hot-paths**: ninguno

## OBJETIVO
Sumar al hub del **profesor** la pestaña **Asistencia** (ruta hija con URL propia, conserva `horarioId`) para que registre y consulte la asistencia de la franja elegida sin salir del curso. Cierra F3 del plan 105 (el estudiante quedó en el brief 760).

## DECISIONES VALIDADAS (no re-preguntar)
- El **shell** es dueño de la carga y del reset (patrón 758–760). La pestaña lee y pide su dato derivado (asistencia) una vez por franja.
- La pestaña es del par con la franja elegida: Asistencia **muestra la franja**, nunca agrega entre franjas.
- Modales intactos hasta F6. La página `profesor/asistencia` **no se retira** en este chat.
- `profesor/` no importa de `estudiante/` (lint de capas); los imports cross-role existentes llevan `eslint-disable` con razón.
- Se mantiene el reparto por rol: el estudiante es solo lectura; el profesor registra.
- **Fuera de D1**: el futuro del menú «Mi Asistencia» del estudiante y el del menú de asistencia del profesor (se deciden con F3 y F3b integradas).

## PRE-WORK
- Leer `chats/awaiting-prod/760-…md` (patrón de la pestaña del estudiante y su razón de diseño) y el commit `8af52898`.
- Leer `pages/profesor/attendance/teacher-attendance.component.ts` (283 ln): hoy es **la** pantalla de asistencia del profesor.
- Leer `pages/profesor/cursos/services/attendance-course.facade.ts` (172 ln) y su store.
- Reglas de UI: `reference/design-system.md`, `a11y.md`, `dialogs-sync.md`, `optimistic-ui.md` (el `registrar` usa WAL).

## DECISIÓN DE DISEÑO OBLIGATORIA
1. **Embeber o enlazar.** Recomendado: **embeber** `AttendanceRegistrationPanelComponent` y `AttendanceSummaryPanelComponent` (ya son presentacionales, reciben `@Input`/outputs y viven en `pages/profesor/cursos/components/`), con la franja del hub en lugar del selector de curso de la página. Alternativa: enlazar a `profesor/asistencia?horarioId=` (más barata, pero deja al profesor fuera del hub). Confirmar en `/design`.
2. **Dueño de la carga.** Igual que en 760: la asistencia depende del `horarioId`, no del contenido. El facade ya acepta `overrideHorarioId` en `loadRegistro`, `loadResumen` y `registrar`, así que la pestaña puede pasar `hubContext.slot().id` sin depender del contenido cargado por el shell.
3. **Reset y cambios sin guardar.** La página llama `resetAsistencia()` al cambiar de curso y al destruirse. En el hub hay que decidir qué pasa con una asistencia **editada sin guardar** al cambiar de franja o de pestaña (hoy el store se descarta). Decidir si se avisa o si basta con no perder el estado al cambiar de pestaña (el reset va solo al cambiar de franja o salir del hub).
4. **`fecha` por query.** La página acepta `?horarioId=&fecha=` (viene del popover de «Mi Horario»). Decidir si la pestaña lo soporta o si ese enlace sigue apuntando a la página.
5. **Día esperado.** `diaSemanaEsperado` y `diaSemanaEsperadoDescripcion` salen del horario elegido; en el hub salen del `slot()`.

## ALCANCE (estimado, re-verificar contra el código)
- Componente `profesor-curso-hub-asistencia.component.ts` + spec (~1 componente nuevo).
- `CURSO_HUB_TABS`: la pestaña `asistencia` pasa a `roles: ['estudiante', 'profesor']`; actualizar el spec de `cursoHubTabsFor`. Ruta hija en `intranet.routes.ts` (el `CursoHubTabPath` ya incluye `asistencia`).
- Facade: solo añadir, si hace falta cancelar cargas en vuelo al cambiar de franja.

## IMPLEMENTATION DETAIL (ADR-0006)
- **Estado actual de `main`**:
  - La pestaña del estudiante vive en `pages/estudiante/cursos/curso-hub/estudiante-curso-hub-asistencia.component.ts`. Pide con `effect` sobre `hubContext.slot()?.id`, usa `untracked` y muestra solo el resumen cuyo `horarioId` coincide con la franja.
  - La tabla `CURSO_HUB_TABS` ya trae `{ path: 'asistencia', label: 'Asistencia', icon: 'pi pi-check-square', roles: ['estudiante'] }`, ubicada antes de `informacion`.
  - El shell del profesor (`profesor-curso-hub.component.ts`) carga con `dataFacade.loadContenidoForHub(id, { salonId })` en un `effect` y resetea con `inject(DestroyRef).onDestroy`. No declarar `destroyRef` propio en el shell (choca con `CursoHubShellBase`).
- **Facade de asistencia del profesor**: `AttendanceCourseFacade` (`vm`, `loadRegistro(fecha, overrideHorarioId?)`, `loadResumen(inicio, fin, overrideHorarioId?)`, `registrar(overrideHorarioId?)`, `setEstudianteEstado`, `setEstudianteJustificacion`, `resetAsistencia`). `getHorarioId()` privado cae al contenido cargado si no se pasa override: en el hub **siempre pasar el override**.
- **Handlers de la página** (modelo a replicar): `onFechaChange` → `loadRegistro(fecha, id)`; `onSaveAsistencia` → `registrar(id)`; `onBuscarResumen` → `loadResumen(…, id)`; `ngOnDestroy` → `resetAsistencia()`.
- **Patrón de pestaña** (760): botón de refresco con `eduTooltip`, estados vacío y error con `app-empty-state`, `data-info-anchor` en los controles. En el profesor el selector de curso no existe: la franja la fija el shell.
- **Specs**: referencia en `estudiante-curso-hub-asistencia.component.spec.ts` (mock del facade por signal, `CursoHubContextService` simulado con un signal `slot`, `overrideComponent` con template vacío) y en `profesor-curso-hub-calificaciones.component.spec.ts`. En el spec del shell, `beforeEach(() => vi.clearAllMocks())` evita fugas del destroy del test anterior.

## APRENDIZAJES TRANSFERIBLES (de 760)
- **Orden de efectos**: el `effect` del shell y el de la pestaña pueden correr en cualquier orden. Por eso el estudiante **no** limpia la asistencia desde `loadContenidoForHub`: el facade es idempotente por franja y la vista compara `horarioId`. Aplicar la misma idea en el profesor.
- **`withRetry` y los tests**: reintenta errores no 4xx con espera, así que el error no llega síncrono. Para probar la rama de error usar `new HttpErrorResponse({ status: 400 })`.
- **Edición de archivos**: en el worktree los archivos están en **LF**, no CRLF; `Edit` y heredocs `python - <<'EOF'` funcionaron con mensajes largos. Para archivos nuevos usar `Write`.
- **Worktree nuevo sin `node_modules`**: `bun install --frozen-lockfile` tarda ~110 s; lanzarlo en segundo plano al crearlo.
- **Validación**: `bun run lint` pasa con 4 warnings preexistentes ajenos (`correlation-request-section.spec`, `usuarios-data.facade` ×3). `bun run build` pasa. Vitest de `pages/profesor` y `shared/components` es el alcance mínimo.
- **Cierre**: copiar el brief a `awaiting-prod/` dentro del worktree y borrar el original sin trackear de `main`. El worktree se integra con `/wt-merge` y se limpia con `/wt-clean`; `git branch -d` exige que `main` ya tenga el merge.
- **Pendiente de revisar en vivo (760)**: cómo se ven los `stat-card` de la pestaña del estudiante; el profesor reutiliza paneles propios, no esos estilos.

## FUERA DE ALCANCE
- Pestaña Salón (F4, puede ir en paralelo), tarjeta por par y redirect legacy (F5a), migración de consumidores y `returnTo` (F5b), retirada de modales (F6).
- Retirar o redirigir la página `profesor/asistencia`.
- Cambios de BE.

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@data/@config/...`, `logger` de `@core/helpers`, `takeUntilDestroyed`, sin `console.*`. UI en español, código en inglés. Archivos ≤ ~300 ln.

## VALIDACIÓN FINAL
- [ ] `bun run lint`, `bun run build` y `vitest run` de `pages/profesor` y `shared/components` en verde.
- [ ] Deep link a `profesor/cursos/:cursoId/:salonId/asistencia?horarioId=` carga tras recarga; cambiar de franja no deja asistencia ajena.
- [ ] Registrar asistencia en una franja y verla en Resumen; salir del hub limpia el store; abrir el hub no abre modales.
- [ ] Verificación en vivo con «ver como» (par multi-franja). En prod solo lectura; mutar solo en local con BBDD de prueba (`rules/browsing.md`).

## CRITERIOS DE CIERRE
- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `awaiting-prod/` o `closed/` en el mismo commit que el código.
- [ ] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`feat(intranet): P105 D1 F3b — hub Asistencia tab (profesor)`

## PENDIENTES HEREDADOS
- Verificación en vivo de 757, 758, 759 y 760 (en `awaiting-prod/`).
- Push a `main` = deploy a prod: no sin autorización. `main` va 4 commits adelante de `origin/main`.
- Decidir el futuro de los menús de asistencia (estudiante y profesor) cuando F3 y F3b estén integradas.


---

## DISEÑO DEL CHAT (ADR-0006 — detalle descubierto, no vuelve al plan)

**Decisiones del usuario (2026-10-03)**: A2 = avisar con confirmación si hay asistencia editada sin guardar al cambiar de franja · B2 = la pestaña soporta `?fecha=`.

**Hallazgos de `/investigate`**
- Único consumidor de `AttendanceCourseFacade` hoy: `teacher-attendance.component` (los modales no lo usan).
- `AsistenciaCursoFechaDto` y `AsistenciaCursoResumenDto` traen `horarioId` → la vista descarta lo que no coincide con la franja (patrón 760).
- `registrar(override)` toma `registroData` del store sin comprobar que sea de ese `horarioId` → riesgo de guardar la lista de la franja A en la B.
- `loadRegistro`/`loadResumen` no cancelan la carga anterior (carrera A/B).
- El refetch cross-tab usa `getHorarioId()` del store de *contenido*: en el hub una franja sin contenido no refrescaría.
- Los paneles son de búsqueda manual y guardan su fecha en estado local.
- El cambio de franja pasa por `CursoHubShellBase.onSlotChange` (compartido con estudiante) y por `CursoHubHeaderComponent` (select-button con `ngModel`: si se bloquea el cambio, hay que revertir el control).

**Diseño**
1. Pestaña nueva `profesor-curso-hub-asistencia.component.ts`: embebe ambos paneles; `effect` sobre `slot().id` + `untracked`; override siempre; dueña de la `fecha` (`?fecha=` → fecha del store si es de la franja → hoy) y la pasa por `initialFecha`.
2. Shell profesor: dueño del reset (`resetAsistencia()` en su `onDestroy`). Cambiar de pestaña conserva ediciones.
3. Store: baseline del registro + `registroDirty`; `markRegistroSaved()` al confirmar el guardado.
4. Facade: cancelar carga previa; `registrar` rechaza si `data.horarioId !== horarioId`; refetch por `registroData.horarioId`.
5. Aviso A2: `CursoHubShellBase` gana un hook `hasUnsavedChanges()` (false por defecto; profesor lo sobreescribe) y un `EduConfirmDialog` propio (providers en cada shell, fuera de `@if`). El header recibe `resetKey` para revertir el select-button si se cancela.
6. `CURSO_HUB_TABS`: `asistencia` → `['profesor','estudiante']`; ruta hija.

**Límites conocidos (reportar al cierre)**: el aviso cubre el selector de franja; no cubre back/forward del navegador ni salir del hub (el reset descarta). Cambiar la fecha dentro del panel con ediciones pendientes ya descartaba sin aviso en la página; se mantiene.

## RESULTADO (2026-10-03)

> **Validación prod**: ⏳ pendiente desde 2026-10-03

- **Alcance**: pestaña Asistencia del profesor (ruta hija `…/asistencia`) que embebe los paneles de registro y resumen con la franja del shell. Cierra F3 del plan 105 (estudiante en 760).
- **Decisiones del usuario**: A2 (aviso «Cambios sin guardar» al cambiar de franja) y B2 (la pestaña soporta `?fecha=`).
- **Compartido con estudiante**: `CursoHubShellBase` gana el hook `hasUnsavedChanges()` (false por defecto) y un `edu-confirm-dialog`; `CursoHubHeaderComponent` gana `resetKey` (revierte el select-button con `NgModel.control.setValue`, porque un `ngModel` con el mismo valor no se re-escribe). Ambos shells proveen `EduConfirmationService`.
- **Facade/store**: baseline + `registroDirty`, `markRegistroSaved()` al confirmar; `registrar` rechaza si la lista es de otro `horarioId`; carga previa se cancela; refetch cross-tab por `registroData.horarioId`.
- **Validación local**: lint 0 errores (4 warnings preexistentes) ✅ · build ✅ · vitest `pages/profesor` + `pages/estudiante` + `shared` 742 verdes ✅.
- **Doc-watch**: revisado `invariants/asistencia.md` (coord), sin claims desactualizados; el guard del facade es defensa de FE, no invariante de dominio.
- **Pendiente en vivo**: deep link `profesor/cursos/:cursoId/:salonId/asistencia?horarioId=` tras recarga; cambiar de franja no deja asistencia ajena; registrar y ver en Resumen; salir del hub limpia el store; aviso de cambios sin guardar con par multi-franja («ver como»); `?fecha=`. En prod solo lectura.
- **Límites conocidos (sin cubrir)**: back/forward del navegador y editar `horarioId` en la URL cambian de franja sin aviso; salir del hub por el menú descarta ediciones sin aviso; cambiar la fecha dentro del panel con ediciones pendientes descarta sin aviso (igual que la página). Candidato a brief aparte: `canDeactivate`/guard de router.
- **Derivados**: decidir el futuro de los menús de asistencia (estudiante y profesor) ahora que F3 y F3b están integradas; F4 (Salón) puede ir en paralelo.

## CIERRE
Pedir feedback con `/feedback`.
