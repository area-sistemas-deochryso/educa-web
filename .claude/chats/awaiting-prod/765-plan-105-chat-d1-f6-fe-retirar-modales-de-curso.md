# 765 — FE: P105 D1 F6 — Retirar los modales de curso y su código muerto

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1-F6 · **Fase**: F6 · **Creado**: 2026-10-05 · **Estado**: ✅ cerrado local 2026-10-05
> **Validación prod**: ⏳ pendiente desde 2026-10-05 — verificar con «ver como» que Cursos, Salones y Horarios llegan al hub sin modales
> **Origen**: brief 764 (F5b, commit `7ea76c54`, integrado en `main` local sin push; vive en `awaiting-prod/`)
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso" (fila F6). El plan se lee solo por intención y decisiones.
> **depends_on**: F5b ✅ (764). F1–F5a ✅ (756–763).
> **MODO SUGERIDO**: `/investigate` → `/execute` → `/validate` (sin `/design` salvo que aparezca una decisión abierta)
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: `pages/profesor/cursos/components/curso-content-dialog/**`, `pages/estudiante/cursos/components/curso-content-readonly-dialog/**`, `pages/profesor/cursos/services/curso-contenido-data.facade.ts` y sus consumidores, specs asociados. A confirmar por búsqueda de referencias.
> **hot-paths**: ninguno

## OBJETIVO
Retirar los modales de curso (profesor y estudiante) y todo el código que solo existía para abrirlos, ahora que Salones, Horarios y Cursos navegan directo al hub. Dejar el hub como única vía a un curso.

## DECISIONES VALIDADAS (no re-preguntar)
- El hub trae su propia implementación de Contenido; el modal no se toca hasta F6 (decisión 2026-10-02, plan 105).
- Los enlaces a un curso ya van al hub con `buildCursoHubLink` (F5a y F5b). `returnTo` ya no lo produce nadie.
- Solo FE. El hub es solo para profesor y estudiante.
- **Fuera de D1**: el futuro de los menús de asistencia.

## PRE-WORK
- Leer `chats/awaiting-prod/764-…md` y `763-…md` (estado de `main` y de F5a).
- Buscar referencias antes de borrar: `grep` de `CursoContentDialog`, `curso-content-dialog`, `CursoContentReadonlyDialog`, `CursoContenidoDataFacade`, `loadContenido`, `initialTab`.

## ALCANCE (re-verificar contra el código)
Candidatos a retirar, sin disparador desde F5a:
- `curso-content-dialog` (profesor) y `curso-content-readonly-dialog` (estudiante), con sus specs.
- Builder de la página de cursos que solo alimentaba el modal.
- `CursoContenidoDataFacade.loadContenido` e `initialTab`, **solo si** el hub (`profesor-curso-hub-contenido`, `-informacion`, `estudiante-curso-hub-*`) no los usa. La búsqueda de referencias encontró usos en el hub: confirmar uno por uno antes de borrar.
- Cualquier export de barrel que quede huérfano.
Los símbolos compartidos con el hub (facades, `semanas-accordion`) **no se borran**: se re-verifica quién los consume.

## IMPLEMENTATION DETAIL (ADR-0006)
- **F5b hizo** (`7ea76c54`): los 4 consumidores (`profesor-salones`, `profesor-horarios`, `estudiante-salones`, `estudiante-horarios`) navegan con `buildCursoHubLink`. Salones usa `withSlot: false` (su `horarioId` es solo la primera franja del par); Horarios usa `withSlot: true`. `HorarioBlock` (`shared/helpers/horario-block.helpers.ts` y el tipo local de `estudiante-horarios`) ganó `cursoId`.
- **Redirect legacy** (`setupCursoHubLegacyRedirect`): se mantiene para marcadores viejos; sigue limpiando `horarioId`, `tab` y `returnTo`. Es lo único que menciona `returnTo`.
- **Estado de `main`**: lint 0 errores (4 warnings preexistentes), build OK (27 NG8113 preexistentes), Vitest de `pages/profesor`, `pages/estudiante` y `shared` = 752 verdes.
- Otro posible consumidor del código de curso: `components/schedule/course-details-modal/attachments-modal/attachments-modal.facade.ts` aparece en la búsqueda; verificar si está vivo antes de tocarlo.

## APRENDIZAJES TRANSFERIBLES (de 764)
- **El hub y F5a/F5b no se han visto en vivo**: 757–764 siguen en `awaiting-prod/`. Antes de borrar, conviene verificar en local con «ver como» que ningún flujo todavía llega a un modal.
- **Los 4 consumidores de F5b no tienen spec propio**: ningún test cubre su navegación. Considerar un spec mínimo si F6 toca esos archivos.
- **Specs**: `TestBed.tick()` para flushar effects; mock de `Router`, `ActivatedRoute` y `ErrorHandlerService`. El lint prohíbe `!` y `type X = {…}` (usar `interface`).
- **Lint/Build/Test**: `bun run lint`, `bun run build`, y `bunx vitest run src/app/features/intranet/pages/profesor src/app/features/intranet/pages/estudiante src/app/features/intranet/shared` (~18 s).
- **Worktree**: `git worktree add -b chat/765-… WT/educa-web/765-…`, registrar en `.claude/.locks/worktrees.json` (ignorado por git), copiar el brief a su `running/` y borrar el original de `main`. `bun install --frozen-lockfile` tarda ~110 s: lanzarlo en segundo plano.
- **Cierre**: `awaiting-prod/` está en **21** (soft 20, duro 25). Conviene `/verify` antes de cerrar otro brief ahí. Commit sin `Co-Authored-By`. `/wt-merge` solo deja la rama de integración: para promover a `main` hay que fusionar a mano (`--ff-only`) antes de `/wt-clean`.
- **Doc**: `context/domain.md` y `reference/design-system.md` los marca doc-watch por glob; revisar si F6 cambia algo relevante.

## FUERA DE ALCANCE
- Cambios en el hub, sus pestañas o `curso-pair-card`.
- Guard de salida (`canDeactivate`) para asistencia editada sin guardar: candidato a brief aparte.
- Decidir el futuro de los menús de asistencia.
- Cambios de BE.

## REGLAS OBLIGATORIAS
Standalone + `OnPush`, `inject()`, signals, alias `@app/@core/@data/@config/...`, `logger` de `@core/helpers`, `takeUntilDestroyed`, sin `console.*`. UI en español, código en inglés. `profesor/` no importa de `estudiante/` (lint de capas). No borrar código con consumidores vivos: verificar con `grep` antes.

## VALIDACIÓN FINAL
- [ ] `bun run lint`, `bun run build` y `vitest run` de `pages/profesor`, `pages/estudiante` y `shared` en verde.
- [ ] `grep` de los símbolos retirados no devuelve nada fuera de lo intencional.
- [ ] Verificación en vivo con «ver como»: desde Cursos, Salones y Horarios se llega al hub sin modales. En prod solo lectura; mutar solo en local con BBDD de prueba (`rules/browsing.md`).

## CRITERIOS DE CIERRE
- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `awaiting-prod/` o `closed/` en el mismo commit que el código.
- [ ] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`refactor(intranet): P105 D1 F6 — retire course modals and their dead code`

## PENDIENTES HEREDADOS
- Verificación en vivo de 757–764 (en `awaiting-prod/`).
- Push a `main` = deploy a prod: no sin autorización. `main` local va por delante de `origin/main`.
- Worktree viejo `709-be-p107-gaps-verificacion-f2-salones` sin entrada en el manifest: revisar con `/triage`.
- Con F6 se cierra D1: evaluar `/verify` en bloque y el futuro de los menús de asistencia.

## CIERRE
Pedir feedback con `/feedback`.
