> **Validación prod**: ✅ verificada 2026-05-19 — 20 SVGs con `aria-label="Tendencia 30 días de ..."` en vista Tabla y Kanban. Placeholder sin actividad no validable (todos los grupos con data). Cowork BD-PROD-RO.
> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 43 · **Chat**: 1.2 (ejecución FE) · **Fase**: F1 · **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar (BLOQUEADO por brief 149).
> **Modo sugerido**: `/execute` → `/validate`. Diseño cerrado en chat 148 + ADR-0007.

---

# Plan 43 · Chat 1.2 — Mini-sparkline 30d en cards de ErrorGroup (FE)

## Bloqueo

**No arrancar hasta que el brief 149 (BE) esté en `awaiting-prod/` con el endpoint nuevo de trend disponible.** Sin el endpoint el componente no tiene data que pintar.

## Decisión pendiente al inicio del chat

Antes de tocar código, revisar el estado de **Plan 43 Chat 5.1** ("sparklines genéricas en KPI cards"):

- Si Chat 5.1 está pendiente y el endpoint genérico `/serie-temporal` aún no existe → este brief 150 implementa el componente `<app-error-group-sparkline>` + endpoint específico `/api/sistema/error-groups/{id}/trend` (el BE de 149 puede haberlo entregado o queda como sub-tarea de este chat — chequear).
- Si Chat 5.1 ya está cerrado o en awaiting con endpoint `/serie-temporal` genérico → consumir ese endpoint, no inventar uno paralelo. Reportar el cierre como **consolidación**.

Esta decisión la toma el `/investigate` inicial del chat 150 (5-10 min).

## Objetivo

En la tabla/cards de `/intranet/admin/error-groups`, cada `ErrorGroup` muestra una mini-sparkline 30d que indica si el bug está activo, durmiendo, o explotando. Click abre modal con gráfico ampliado.

## ADR de referencia

[ADR-0007](../../decisions/0007-fingerprint-algorithm-and-merge.md) — aclara el contexto. El FE no implementa nada del ADR (es BE); solo consume.

## Scope estricto

1. Componente nuevo `src/app/shared/components/sparkline/mini-sparkline/mini-sparkline.component.ts`:
   - Standalone + OnPush.
   - Input `data: number[]` (30 puntos esperado), `height: number = 32`, `color: string = 'var(--text-color-secondary)'`, `ariaLabel?: string`.
   - Render con SVG inline (sin libs externas — el dataset es chico, 30 puntos, no justifica chart.js).
   - Sin ejes, sin labels — solo línea + último punto destacado.
   - Si `data.length === 0` o todos `0`: render placeholder `"sin actividad"` (texto chico, color `--text-color-secondary`).
   - Tests vitest: rendering con 30 puntos, placeholder vacío, accesibilidad (aria-label).

2. Tipo `ErrorGroupTrendDto` en `src/app/data/models/error-group.models.ts`:
   - `{ fecha: string; count: number }[]` (formato del endpoint BE).

3. Service: extender `ErrorGroupsService` (o equivalente) con `getTrend(groupId: number): Observable<ErrorGroupTrendDto[]>`.

4. Component `error-groups-list.component.ts` (o nombre real — verificar al inicio):
   - Para cada row, lazy-load del trend al render (con guard de carga + cache en signal del facade para no recargar).
   - Pintar `<app-mini-sparkline [data]="trend30d()" />` en la card.
   - Click → modal con sparkline ampliada (puede ser MVP: el mismo componente con `height=200` en un `p-dialog`).

5. Hacer el lazy-load **respetuoso con el BE** (Plan 26 rate-limiting):
   - Limit concurrency a 3 sparklines en flight simultáneas.
   - Solo cargar trend de los grupos visibles en viewport (intersection observer) — opcional si la lista es chica (< 50 grupos); obligatorio si > 100.

## Fuera de scope

- Heatmap de latencia (eso es Plan 43 Chat 5.2).
- Percentiles p50/p95/p99 — eso es BE 149 si decide entregarlo en el DTO, pero el FE de este chat no los pinta (mantener focus en sparkline).

## Reglas a respetar

- Component standalone + OnPush.
- `inject()`, signals, NgRx donde aplique.
- Lazy-render: usar `<app-lazy-content>` por sección (rules/lazy-rendering.md).
- Skeleton durante carga del trend (rules/skeletons.md — variante `rect`).
- A11y: `[pt]` con aria-label en cualquier botón solo-icono del modal.
- Sin Co-Authored-By.

## Criterio de cierre (DoD)

- [ ] `MiniSparklineComponent` con tests vitest verdes.
- [ ] `ErrorGroupTrendDto` modelado en `data/models/`.
- [ ] Tabla/cards de `error-groups` muestran sparkline cuando el endpoint responde.
- [ ] Click en sparkline abre modal con versión ampliada.
- [ ] Lint + build + tests FE verdes.
- [ ] Smoke browser: abrir `/intranet/admin/error-groups` post-deploy del BE 149, ver sparklines en al menos 1 grupo con historial.
- [ ] Commit en branch `main` (FE convención).

## Plan file

`educa-web/.claude/plan/monitoreo-cowork-feedback-2026-05-11.md` §Chat 1.2.
