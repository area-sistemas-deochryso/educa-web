# 760 — FE: P105 D1 F3 — Pestaña Asistencia del hub (estudiante y profesor)

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1-F3 · **Fase**: F3 · **Creado**: 2026-10-03 · **Estado**: ✅ cerrado local 2026-10-03
> **Origen**: brief 759 (F2b, commit `2cf564dd`, integrado en `main` local sin push) · diseño en briefs 753 y 755
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso" (fila F3)
> **depends_on**: 757 (F1b), 758 y 759 (F2/F2b) integrados en `main`; su verificación en vivo sigue en `awaiting-prod/`
> **MODO SUGERIDO**: `/investigate` corto → `/design` → `/execute` → `/validate`
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: `intranet.routes.ts` (hijas `asistencia`), `shared/components/curso-hub-tabs` (nueva pestaña con `roles`), `pages/estudiante/cursos/curso-hub/**`, `EstudianteCursosFacade` (solo añadir) y, si se incluye al profesor, `pages/profesor/cursos/curso-hub/**`. **No toca los modales de curso.**
> **hot-paths**: ninguno

## OBJETIVO
Sumar la pestaña **Asistencia** al hub como ruta hija con URL propia, para la franja elegida y conservando `horarioId`. Activa `loadMiAsistencia` / `refreshMiAsistencia` del estudiante, que hoy existen en el facade pero no tienen consumidor en el hub. El profesor registra asistencia; el estudiante solo consulta.

## DECISIONES VALIDADAS (no re-preguntar)
- El **shell** es dueño de la carga y del reset (patrón 758/759). La pestaña solo lee y pide su dato derivado (asistencia) una vez por contenido o franja.
- Modales intactos hasta F6; el scss del modal se referencia por `styleUrl` (no se copia).
- `estudiante/` no importa de `profesor/` (lint de capas); tipos vía `CursoHubContextService`. Los imports cross-role que ya existen usan `eslint-disable` con razón.
- La pestaña es del par con la franja elegida: Asistencia **muestra la franja**, nunca se agrega entre franjas.
- **Fuera de D1**: el futuro del menú "Mi Asistencia" del estudiante (se decide cuando F3 esté integrada; puede quedar redundante).

## PRE-WORK
- Leer `chats/awaiting-prod/759-…md` y `758-…md` (patrón dueño de carga) y el commit `2cf564dd`.
- Estudiante: `miAsistencia` / `miAsistenciaLoading` en `estudiante-cursos.store.ts`, `loadMiAsistencia` y `refreshMiAsistencia` en el facade. `getMiAsistencia(horarioId)` usa el **horarioId**, no el `contenidoId`.
- Modal del estudiante: `curso-content-readonly-dialog`, enlace "Ver asistencia" (hoy navega a `/intranet/estudiante/asistencia?horarioId=`).
- Profesor: localizar la página de asistencia existente y qué facade usa; evaluar si se embebe o se enlaza.
- Reglas de UI: `reference/design-system.md`, `a11y.md`, `dialogs-sync.md`.

## DECISIÓN DE DISEÑO OBLIGATORIA
1. **Partición por rol.** Recomendado: **estudiante primero** (consulta, reusa el patrón de 759) y profesor en un chat aparte (registra asistencia, más superficie), como se hizo con 758/759. Confirmar en `/design`.
2. **Dueño de la carga.** La asistencia depende de `horarioId`, no de `contenido.id`. Un franja **sin contenido** igual puede tener asistencia: decidir si el shell la carga o la pestaña la pide con `hubContext.slot().id`, y qué pasa con el estado vacío.
3. **Reset.** `closeContentDialog` ya limpia `miAsistencia`, pero cambiar de franja con la pestaña abierta no: igual que con las notas en 759, cancelar la carga en vuelo y limpiar al cambiar de franja.

## ALCANCE (estimado, re-verificar contra el código)
- Pestaña estudiante `estudiante-curso-hub-asistencia.component.ts` + spec (~1 componente nuevo).
- `CURSO_HUB_TABS` + ruta hija en `intranet.routes.ts` + `CursoHubTabPath` si hace falta.
- Facade/store del estudiante: solo añadir (cancelación y limpieza de asistencia).

## IMPLEMENTATION DETAIL (ADR-0006)
- **Estado actual de `main`**: shell del estudiante (`estudiante-curso-hub.component.ts`) carga con `loadContenidoForHub(slotId)` en un `effect` y resetea con `inject(DestroyRef).onDestroy`. No declarar `destroyRef` propio en el shell, choca con la base `CursoHubShellBase`.
- **Patrón de pestaña** (759): `effect` sobre el id, `untracked` para el pedido, guardas por estado del store (`!misNotasCurso && !misNotasLoading`), botón de refresco con `eduTooltip`, estados vacío y error con `app-empty-state`, y enlace "Ir a Contenido" con `queryParamsHandling="merge"` cuando no hay contenido.
- **Facade**: `notasSub` y `clearMisNotas()` son el modelo para la asistencia. `loadMiAsistencia` hoy no guarda su suscripción ni se cancela.
- **Specs**: referencia en `estudiante-curso-hub-calificaciones.component.spec.ts` (mock de `vm` por signal, `overrideComponent` con template vacío). En el spec del shell, `beforeEach(() => vi.clearAllMocks())` evita fugas del destroy del test anterior.

## APRENDIZAJES TRANSFERIBLES (de 759)
- **Heredocs de bash con `python - <<'EOF'` fallaron dos veces** con mensajes largos: usar `Write` para archivos nuevos y un `.py` en el scratchpad para parches con CRLF.
- Los archivos del repo tienen **CRLF**; al parchear con Python, leer con `newline=''` y respetar el fin de línea.
- El worktree nuevo **no trae `node_modules`**: `bun install --frozen-lockfile` tarda ~110 s; lanzarlo en segundo plano al crear el worktree.
- `bun run build` y `lint` pasan con warnings preexistentes ajenos (`correlation-request-section.spec`, `usuarios-data.facade`, `NG8113 EduTag`).
- El estilo `.stat-box.calificaciones` no existe en el scss del modal del estudiante; revisar en vivo cómo se ve.
- El brief original vivía **sin trackear** en `WD/.claude/chats/` y no en el worktree: al cerrar con `/end`, copiarlo a `awaiting-prod/` dentro del worktree y borrar el original.

## FUERA DE ALCANCE
- Pestaña Salón (F4, puede ir en paralelo), tarjeta por par y redirect legacy (F5a), migración de consumidores y `returnTo` (F5b), retirada de modales (F6).
- Cambios de BE.

## VALIDACIÓN FINAL
- [ ] `bun run lint`, `bun run build` y `vitest run` de `pages/estudiante` y `shared/components` en verde.
- [ ] Deep link a `…/asistencia` carga tras recarga; cambiar de franja no deja asistencia ajena.
- [ ] Salir del hub limpia el store; abrir el hub no abre modales.
- [ ] Verificación en vivo con "ver como" (par multi-franja) si no hay estudiante de prueba.

## CRITERIOS DE CIERRE
- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `awaiting-prod/` o `closed/` en el mismo commit que el código.
- [ ] Commit sin `Co-Authored-By`.

## COMMIT MESSAGE sugerido
`feat(intranet): P105 D1 F3 — hub Asistencia tab (estudiante)`

## PENDIENTES HEREDADOS
- Verificación en vivo de 757, 758 y 759 (en `awaiting-prod/`).
- Push a `main` = deploy a prod: no sin autorización. `main` va 3 commits adelante de `origin/main`.
- Decidir el futuro de "Mi Asistencia" del estudiante cuando F3 esté integrada.

## RESULTADO (2026-10-03)

> **Validación prod**: ⏳ pendiente desde 2026-10-03

- **Alcance**: solo estudiante (profesor en chat aparte). Pestaña de solo lectura + enlace «Justificar inasistencias» a `/intranet/estudiante/asistencia?horarioId=` cuando hay faltas.
- **Dueño de la carga**: la pestaña pide con `hubContext.slot().id` (franja sin contenido igual tiene asistencia). Facade: `loadMiAsistenciaForHub` (idempotente por franja, cancela la anterior) y `refreshMiAsistenciaForHub`; `resetForHub` cancela. La vista descarta resúmenes con otro `horarioId`.
- **Validación local**: vitest (pages/estudiante + shared) ✅, lint 0 errores ✅, build ✅.
- **Pendiente en vivo**: deep link a `…/asistencia` tras recarga, cambio de franja sin asistencia ajena, salir del hub limpia el store, «ver como» con par multi-franja; revisar cómo se ven los `stat-card` en vivo.
- **Derivados**: pestaña Asistencia del profesor (chat aparte); decidir futuro del menú «Mi Asistencia» del estudiante.

## CIERRE
Pedir feedback con `/feedback`.
