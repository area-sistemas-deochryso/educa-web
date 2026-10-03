# 758 — FE: P105 D1 F2 — Pestañas Calificaciones e Información del hub (profesor y estudiante)

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1-F2 · **Fase**: F2 · **Creado**: 2026-10-03 · **Estado**: ✅ implementado (2026-10-03)
> **Origen**: brief 757 (F1b, commit `505dba77`, en `main` local sin push) · diseño en briefs 753 y 755
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso"
> **depends_on**: 757 (F1b integrado en `main`; su verificación en vivo sigue en `awaiting-prod/`)
> **MODO SUGERIDO**: `/investigate` corto → `/design` (ver "Decisión de diseño obligatoria") → `/execute` → `/validate`
> **exclusive**: `false`
> **isolation**: `worktree`
> **touches**: `educa-web` — `intranet.routes.ts` (rutas hijas), `shared/components/curso-hub-{shell,tabs}/**`, `pages/{profesor,estudiante}/cursos/curso-hub/**`. **No toca los modales de curso.**
> **hot-paths**: ninguno

## OBJETIVO

Sumar al hub las pestañas **Calificaciones** e **Información** (profesor y estudiante) como rutas hijas con URL propia, junto a Contenido. Si el lado estudiante lo pide, partir en dos chats (profesor / estudiante). Los modales **quedan intactos** hasta F6.

## DECISIONES VALIDADAS (no re-preguntar)

| Tema | Resultado |
|---|---|
| Relación con el modal | El hub tiene su propia implementación; el modal no se modifica. Duplicación temporal pequeña hasta F6. |
| Pestañas | Rutas hijas con URL propia, reemplazo de URL, conservan `horarioId`. |
| Roles | Misma estructura de pestañas. Profesor edita/califica/administra; estudiante consulta. |
| Resto | Ver el plan P105 D1. No se reabren. |

## PRE-WORK (re-verificar; el código puede haber cambiado)

- Leer `chats/awaiting-prod/757-…md` y el commit `505dba77`: es la base.
- Modal del profesor (referencia, no se modifica): `curso-content-dialog.component.{ts,html}` — tabs 1 (Calificaciones) y 2 (Información) y sus handlers (`onCrearEvaluacion` … `onEliminarPeriodo`, `onOpenArchivosSummary/TareasSummary/StudentFiles`, `onDeleteContenido`). Modal del estudiante: `curso-content-readonly-dialog` (tab "Mis Calificaciones" + Información).
- Diálogos de Calificaciones (profesor): `evaluacion-form-dialog`, `calificar-dialog`, `periodos-config-dialog`, panel `calificaciones-panel`; `CalificacionesFacade` (`loadCalificaciones(contenidoId)`, `resetCalificaciones`, `salonEstudiantes`, `gruposForCalificar`…). Información: `archivos-summary-dialog`, `tareas-summary-dialog`, `student-files-dialog`.
- Reglas de UI: `.claude/reference/dialogs-sync.md` (diálogos nunca dentro de `@if`), `a11y.md`, `design-system.md`.

## DECISIÓN DE DISEÑO OBLIGATORIA (el hallazgo central de F1b)

En F1b **la pestaña Contenido es dueña de la carga y del reset**: su efecto llama `loadContenidoForHub(slotId)` y su `ngOnDestroy` llama `resetForHub()` (profesor) / `resetForHub()` (estudiante). Con más pestañas esto se rompe:

1. Un deep link directo a `…/calificaciones` **no carga el contenido** (la carga vive en la pestaña Contenido) y Calificaciones necesita `contenido.id`.
2. Cambiar de pestaña destruye Contenido y **vacía el store compartido**, perdiendo lo que la otra pestaña necesita.

Hay que decidir (y escribir en `/design`) dónde vive la carga/reset: p. ej. en el shell (o un servicio del hub) con la franja ya resuelta, y que las pestañas solo lean el store. Cuidar: la carga no debe bloquear el primer pintado del encabezado; el reset ocurre al **salir del hub**, no al cambiar de pestaña; `CalificacionesFacade` lee `salonId` del `CursoContenidoStore` (se llena con `loadContenidoForHub(…, { salonId })`).

## CRITERIOS DE ACEPTACIÓN

1. Rutas hijas `calificaciones` e `informacion` bajo cada shell, agregadas a `CURSO_HUB_TABS`, heredando autorización y gate de "ver como".
2. Deep link a cualquiera de las pestañas funciona tras recarga (carga el contenido por sí misma o vía el dueño decidido arriba) y cambiar de pestaña/franja no deja estado de otra franja.
3. Profesor — Calificaciones: paridad con el modal (crear/editar/eliminar evaluación, cambiar tipo, calificar individual y por grupos, periodos). Información: datos del curso, contadores y sub-diálogos (archivos, tareas, adjuntos de estudiantes); eliminar contenido **sin** efectos de modal (`eliminarContenido` hoy cierra el diálogo del modal y su rollback lo reabre: se necesita variante del hub).
4. Estudiante — Mis Calificaciones (`app-notas-curso-card`, carga perezosa, refresco) e Información (contadores + resúmenes de archivos/tareas).
5. Los botones "Ir a calificaciones" (`student-task-submissions-dialog`, `student-files-dialog`, stat-box) navegan a la pestaña conservando `horarioId` — en F1b solo cierran el diálogo.
6. Abrir el hub no abre ningún modal; salir limpia stores (incl. `CalificacionesFacade`).
7. Modales y páginas de Cursos sin cambios de comportamiento ni de archivos; en facades/stores compartidos solo **añadir**.
8. Tests nuevos (rutas hijas, camino de carga/ownership, handlers); `lint`, `build` y `test` en verde.

## IMPLEMENTATION DETAIL (ADR-0006) — lo que dejó F1b

- **Contrato de franja**: `CursoHubContextService` (`shared/components/curso-hub-shell/`, root). El shell hace `bind(this.slot)` en el constructor y `unbind` al destruirse; las hijas leen `ctx.slot()` (síncrono). Para reaccionar solo al cambio de franja usar `computed(() => ctx.slot()?.id ?? null)` — el objeto se re-crea si el store de horarios se refresca.
- **Pestañas**: `app-curso-hub-tabs` + `CURSO_HUB_TABS` (`shared/components/curso-hub-tabs/`); `routerLink` relativo, `queryParamsHandling="merge"`, `replaceUrl`. Para agregar pestañas: sumar entrada al array + ruta hija.
- **Rutas**: `children` en `profesor/cursos/:cursoId/:salonId` y `estudiante/...` (`intranet.routes.ts`): `''` → redirect `contenido`; el `permissionPath` del padre se hereda por walk-up.
- **Shell**: `onSlotChange`/`dropInvalidSlotQuery` navegan **sin `relativeTo`** (con `relativeTo` del shell se perdía la pestaña hija).
- **Carga sin modal**: `CursoContenidoDataFacade.loadContenidoForHub / resetForHub / crearContenidoEnHub` y `EstudianteCursosFacade.loadContenidoForHub / resetForHub` (latest-wins con `Subscription`; no tocan flags de diálogo). `refreshContenido()` y el refetch cross-tab siguen funcionando porque el hub setea `selectedHorarioId`.
- **Componentes**: `profesor-curso-hub-contenido.component.ts` (aloja semana-edit/tarea/entregas/builder, `providers: [EduConfirmationService]` + `<edu-confirm-dialog />`, reutiliza `semanas-accordion`) y `estudiante-curso-hub-contenido.component.{ts,html}` (markup copiado del tab del modal; **su scss es el del modal referenciado por `styleUrl`**; al hacer F2 estudiante conviene seguir igual y mover los scss en F6).
- **Estado de F1b**: commit `505dba77` en `main` local (sin push; `main` va 9 commits adelante). Verificación en vivo pendiente (brief 757 en `awaiting-prod/`).

## APRENDIZAJES TRANSFERIBLES

- **Estado compartido con el modal**: stores/facades son `providedIn: 'root'` y compartidos; `crearContenido`, `eliminarContenido`, `loadContenido`, `switchCourse` abren/cierran diálogos del modal → nunca usarlos desde el hub; añadir variantes (patrón `…ForHub`/`…EnHub`).
- **Lint**: `estudiante/` no puede importar de `profesor/` (`layer-enforcement/imports-error`; los tipos se obtienen de `CursoHubContextService`); `max-lines` 300 (se usó `eslint-disable` con razón en `estudiante-cursos.facade.ts`, precedente en `curso-content-dialog`); `type` → `interface`.
- **Tests**: en specs de componentes con `TestBed.overrideComponent`, hacerlo **antes** de cualquier `TestBed.inject`. Patrón de specs: `profesor-curso-hub-contenido.component.spec.ts`, `curso-contenido-data.facade.hub.spec.ts`.
- **Entorno**: el worktree no trae `node_modules` (`bun install` local es rápido; nunca tocar `package-lock.json`/`ci.yml`/`netlify.toml`). En la herramienta Bash los heredocs con comillas complejas fallaron: crear archivos con la herramienta Write. `/wt-merge` + `/wt-clean` ya se corrieron para 757 (sin ramas `integration/*` pendientes).
- **Verificación en vivo** (aún no hecha en F1b): Chrome visible (ocluida, `captureScreenshot` se cuelga); login con el switcher sin tipear credenciales; en prod solo lectura; local con `UseTestEnv: true` para mutar. Par curso 24 / salón 34 (2 franjas, contenidos 8 y 11) y par 14 / salón 25 (3 franjas, sin contenido). No hay estudiante de prueba confirmado en par multi-franja: confirmarlo antes de prometerlo; si no existe, verificar como profesor y con "ver como".

## FUERA DE ALCANCE

- Asistencia (F3), Salón (F4), tarjeta por par / redirect legacy (F5a), migración de consumidores y `returnTo` (F5b), retirada de modales (F6). Cambios de BE. Refactorizar los modales para compartir código.

## REGLAS OBLIGATORIAS

- Código en inglés, UI en español. Standalone + OnPush, `inject()`, `logger`, alias de imports, `takeUntilDestroyed`.
- Ante contradicción con lo documentado o con el código, detener y consultar.
- Push a `main` de `educa-web` = deploy a prod: este chat no pushea sin autorización.

## VALIDACIÓN FINAL

- `npm run lint` · `npm run build` · `npm test` en verde; verificación en vivo según el pre-work.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Maestro actualizado (si el 757/758 está en cola).
- [ ] Brief movido `running/` → `closed/`/`awaiting-prod/` en el mismo commit que el código.

## COMMIT MESSAGE sugerido

`feat(intranet): P105 D1 F2 — hub Calificaciones and Informacion tabs` (inglés, imperativo, sin `Co-Authored-By`).

## CIERRE

Feedback con `/feedback` al cerrar; recordar el pendiente de verificación en vivo de 757 y F2.

> **Validación prod**: ⏳ pendiente desde 2026-10-03 — verificación en vivo (deep link por pestaña, eliminar contenido, "Ir a calificaciones", par 24/34) sin hacer.

## RESULTADO
- Alcance: solo profesor (partido a pedido). Shell del profesor dueño de carga/reset; pestañas Calificaciones e Información; loader perezoso de calificaciones; variantes `eliminarContenidoEnHub`, `loadCalificacionesForHub`/`resetForHub`.
- Estudiante: pendiente en brief nuevo (su shell debe adoptar el mismo patrón; hoy su pestaña Contenido sigue siendo dueña).
- Validación: lint 0 errores · build ok · 298 archivos / 2968 tests ok.
