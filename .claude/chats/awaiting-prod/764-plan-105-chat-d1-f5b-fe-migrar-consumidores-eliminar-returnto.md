# 764 — FE: P105 D1 F5b — Migrar consumidores del query legacy al hub y eliminar `returnTo`

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1-F5b · **Fase**: F5b · **Creado**: 2026-10-05 · **Estado**: ✅ código cerrado 2026-10-05
> **Origen**: brief 763 (F5a, commit `d2ecd2d8`, integrado en `main` local sin push; vive en `awaiting-prod/`)
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso" (fila F5b). El plan se lee solo por intención y decisiones.
> **depends_on**: F5a ✅ (763). F2–F4 ✅ (758–762).
> **Validación prod**: ⏳ pendiente desde 2026-10-05 (ver «ver como»: clic desde Salones y Horarios, franja correcta, «atrás»)
> **MODO SUGERIDO**: `/investigate` → `/execute` → `/validate` (sin `/design` salvo que aparezca una decisión abierta)
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: `pages/profesor/classrooms/profesor-salones.component.ts`, `pages/profesor/schedules/profesor-horarios.component.ts`, `pages/estudiante/classrooms/estudiante-salones.component.ts`, `pages/estudiante/schedules/estudiante-horarios.component.ts`, sus specs si existen. Lectura de `shared/helpers/curso-hub-link.helpers.ts`, `curso-hub-legacy-redirect.helpers.ts`. **No toca** el hub, sus pestañas, `profesor-cursos`/`estudiante-cursos` ni los modales (F6).
> **hot-paths**: ninguno

## OBJETIVO
Que los enlaces internos a un curso (desde Salones y Horarios, profesor y estudiante) vayan **directo al hub** con `buildCursoHubLink`, en vez de pasar por `…/cursos?horarioId=N` y depender del redirect de F5a. Eliminar `returnTo` (ya no tiene efecto). El redirect de F5a se queda solo para marcadores y enlaces externos viejos.

## DECISIONES VALIDADAS (no re-preguntar)
- Enlaces por el helper único `buildCursoHubLink(rol, horario, { withSlot })` de `@intranet-shared/helpers`; nada de armar la URL a mano.
- Pestañas con reemplazo de URL; el «atrás» del navegador vuelve al origen. Como el consumidor navega con push directo al hub, «atrás» vuelve a Salones/Horarios sin `returnTo`.
- Solo FE. Los modales de curso siguen en el código hasta F6. El hub es solo para profesor y estudiante.
- **Fuera de D1**: el futuro de los menús de asistencia.

## PRE-WORK
- Leer `chats/awaiting-prod/763-…md` (diseño F5a, sección «DISEÑO F5a») y `762`.
- Leer `curso-hub-link.helpers.ts` (`buildCursoHubLink`, `withSlot`) y el resumen de Salón del hub (`curso-hub-salon-summary`), que ya usa el helper con `id: 0` para otros cursos.
- Leer los 4 consumidores en el método que navega a Cursos.

## ALCANCE (re-verificar contra el código)
Productores actuales del query (confirmados en F5a):
- `profesor-salones.component.ts:~83` → `/intranet/profesor/cursos` con `{ horarioId, returnTo: 'salones' }`.
- `profesor-horarios.component.ts:~271` → `{ horarioId, returnTo: 'horarios' }`.
- `estudiante-salones.component.ts:~163` → `{ horarioId }`.
- `estudiante-horarios.component.ts:~306` → `{ horarioId }`.
- `plazos-widget` enlaza a `/intranet/<rol>/cursos` sin query: **no cambia**.
Cada uno debe pasar a `router.navigate(commands, { queryParams })` con el destino de `buildCursoHubLink`. Decidir en cada caso `withSlot` (¿el origen conoce la franja? Horarios sí; Salones solo conoce el `horarioId` de la fila, que también es una franja del par).
Eliminar `returnTo` de los productores. En F5a el redirect ya lo ignora (`tab` y `returnTo`); evaluar si conviene dejar de limpiarlos en `setupCursoHubLegacyRedirect` o mantenerlo para enlaces viejos (recomendado mantenerlo: son marcadores viejos).

## IMPLEMENTATION DETAIL (ADR-0006)
- **F5a ya hizo** (`d2ecd2d8`): helper `groupHorariosByPair` (`shared/helpers/curso-hub-pair.helpers.ts`), `setupCursoHubLegacyRedirect` (`curso-hub-legacy-redirect.helpers.ts`, función de inyección, reacciona a `queryParamMap`), componente compartido `app-curso-pair-card` y las dos páginas de Cursos reescritas (sin modales ni tooltips).
- **Redirect legacy**: `horarioId` en la lista → `router.navigate` al hub con `replaceUrl`; ausente tras una carga observada → aviso «Franja no disponible» y limpia `horarioId`/`tab`/`returnTo`; si la carga falló, solo limpia. La página muestra spinner mientras está `pending`.
- **Verificado en F5a**: ningún productor FE pasa `tab`; el BE no se pudo verificar desde el FE.
- **Estado de `main`**: `profesor-cursos` y `estudiante-cursos` ya no abren modales; los componentes `curso-content-dialog`, `curso-content-readonly-dialog` y el builder de la página quedan sin disparador hasta F6 (y `CursoContenidoDataFacade.loadContenido`/`initialTab` también).

## APRENDIZAJES TRANSFERIBLES (de 763)
- **El hub y F5a no se han visto en vivo**: 757–763 siguen en `awaiting-prod/`. Verificar en local con «ver como» un par multi-franja, el redirect (`horarioId` existente, inexistente) y el «atrás».
- **Specs**: `TestBed.tick()` para flushar effects; `TestBed.runInInjectionContext` para funciones de inyección; mock de `Router`, `ActivatedRoute` (BehaviorSubject de `convertToParamMap`) y `ErrorHandlerService`. El lint prohíbe `!` (non-null assertion) y `type X = {…}` (usar `interface`).
- **Lint/Build/Test**: `bun run lint` pasa con 4 warnings preexistentes ajenos; `bun run build` pasa (27 warnings NG8113 preexistentes); Vitest de `pages/profesor`, `pages/estudiante` y `shared` = 752 verdes al cierre de F5a.
- **Worktree**: crear a mano (`git worktree add -b chat/764-… WT/educa-web/764-…`), registrar en `.claude/.locks/worktrees.json` (ignorado por git), copiar el brief a su `running/` y borrar el original de `main`. `bun install --frozen-lockfile` tarda ~105 s: lanzarlo en segundo plano (no toca lockfiles).
- **Cierre**: `awaiting-prod/` está en **20** (límite blando; duro 25). Conviene `/verify` antes de cerrar otro brief ahí. Commit sin `Co-Authored-By`. Integrar con `/wt-merge` y limpiar con `/wt-clean`.
- **Doc**: `.claude/context/domain.md` ya describe F5a; revisar al cerrar F5b. `reference/design-system.md` quedó marcado para revisión por la tarjeta nueva (`curso-pair-card`).

## FUERA DE ALCANCE
- Retirar los modales de curso y su código muerto (F6).
- Cambios en el hub, sus pestañas, `profesor-cursos`, `estudiante-cursos`.
- Guard de salida (`canDeactivate`) para asistencia editada sin guardar: candidato a brief aparte (límite conocido de 761).
- Decidir el futuro de los menús de asistencia.
- Cambios de BE.

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@data/@config/...`, `logger` de `@core/helpers`, `takeUntilDestroyed`, sin `console.*`. UI en español, código en inglés. Archivos ≤ ~300 ln. `profesor/` no importa de `estudiante/` (lint de capas). HTTP one-shots en services root con `firstValueFrom`.

## VALIDACIÓN FINAL
- [ ] `bun run lint`, `bun run build` y `vitest run` de `pages/profesor`, `pages/estudiante` y `shared` en verde.
- [ ] Desde Salones y Horarios (profesor y estudiante), el clic en un curso abre el hub directo, con la franja que corresponde; «atrás» vuelve al origen.
- [ ] No queda ninguna referencia a `returnTo` en los productores; `grep returnTo src` solo debe aparecer en el redirect (si se decide mantenerlo) y sus specs.
- [ ] Verificación en vivo con «ver como». En prod solo lectura; mutar solo en local con BBDD de prueba (`rules/browsing.md`).

## CRITERIOS DE CIERRE
- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `awaiting-prod/` o `closed/` en el mismo commit que el código.
- [ ] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`feat(intranet): P105 D1 F5b — link course cards straight to the hub and drop returnTo`

## PENDIENTES HEREDADOS
- Verificación en vivo de 757–763 (en `awaiting-prod/`).
- Push a `main` = deploy a prod: no sin autorización. `main` local va por delante de `origin/main` (15 commits al cierre de 763; el ref remoto puede estar desactualizado).
- F6 (retirar modales) y el futuro de los menús de asistencia: agregar a la cola del maestro si aplica (hoy la cola está vacía).
- Worktree viejo `709-be-p107-gaps-verificacion-f2-salones` sin entrada en el manifest: revisar con `/triage`.

## CIERRE
Pedir feedback con `/feedback`.
