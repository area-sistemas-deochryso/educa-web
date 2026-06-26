# 330 F3+F4 — FE: Runtime Health alerts UI + diagnostics actions

> **Repos afectados**: `educa-web`
> **Plan**: see `chats/open/330-runtime-health-persistence-and-insights.md` Phases 3-4
> **Created**: 2026-06-18 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: `false`
> **modules**: `runtime-health`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/sistema/runtime-health/**`

## Context

Phases 1-2 are complete in this branch (persistence BE + historical trends FE). The BE endpoints for Phase 3 (alerts/thresholds) and Phase 4 (diagnostics/actions) are merged to Educa.API main but **not yet deployed** — stub responses or dev-proxy may be needed for local testing.

### Available BE endpoints (F3 — alerts & thresholds)

- `GET /api/sistema/runtime-health/alerts` — recent threshold breaches (snapshots where AlertLevel != null, last 100, newest first).
- `GET /api/sistema/runtime-health/thresholds` — all configured thresholds.
- `PUT /api/sistema/runtime-health/thresholds` — upsert threshold config (array of threshold objects).

Threshold shape: `{ metricKey: string, warnValue: number, criticalValue: number, direction: 'Above' | 'Below' }`.

Alert shape on snapshots: `alertLevel` field — `null`, `"warn"`, or `"critical"`.

### Available BE endpoints (F4 — diagnostics)

- `POST /api/sistema/runtime-health/force-gc` — returns `{ heapBeforeMb, heapAfterMb, collectedMb }`.
- `GET /api/sistema/runtime-health/slow-requests?top=N` — returns top N slowest endpoints `{ path, p50, p95, p99, count }[]`, sorted by p95 desc. Default 10, max 50.

## Deliverables

### Phase 3 FE — Alerts & thresholds

1. **Threshold config panel**: editable table of metrics with warn/critical values and direction. Uses `PUT /thresholds` to save, `GET /thresholds` to load. Inline editing preferred (PrimeNG `p-table` with `editMode="cell"` or a dedicated `p-dialog`).

2. **Visual indicators on live snapshot**: green/yellow/red badge per metric based on current thresholds. The `alertLevel` field from `GET /history` (raw, latest) or live snapshot indicates severity.

3. **Alert timeline**: list of recent breaches from `GET /alerts` — timestamp, metric, value, threshold breached. Filterable by severity (warn/critical).

4. **Recommendations**: when a threshold is breached, show a contextual suggestion:
   - `requests.p95 > warn` → "Verificar consultas lentas"
   - `threadPool.queueLength > warn` → "Posible starvation — revisar tareas bloqueantes"
   - `db.activeConnections > warn` → "Revisar connection pool — posible leak"
   - `gc.heapMb > warn` → "Presión de memoria alta — considerar Force GC"

### Phase 4 FE — Diagnostics & actions

1. **Force GC button**: in the live snapshot GC section. Confirmation dialog showing current heap. After action, show before/after comparison toast or inline result.

2. **Slow requests table**: expandable section below the live snapshot or as a new tab. Shows top slow endpoints with p50/p95/p99/count columns. Auto-refresh optional.

3. **Correlation view**: when a metric spikes in the historical chart, clicking a data point shows a tooltip/panel with other metrics at that timestamp. This uses existing `/history` data — no new endpoint needed.

## Facade/store/service pattern

Follow existing `runtime-health` architecture:
- **Service**: add methods for the new endpoints (getAlerts, getThresholds, updateThresholds, forceGc, getSlowRequests).
- **Store**: signals for alerts, thresholds, slowRequests, forceGcResult.
- **Facade**: orchestration methods consumed by components.

## Criterio de cierre

- [ ] Threshold config panel loads, edits, and saves thresholds.
- [ ] Live snapshot metrics show green/yellow/red indicators based on thresholds.
- [ ] Alert timeline displays recent breaches with filtering.
- [ ] Recommendations appear contextually on threshold breach.
- [ ] Force GC button works with confirmation and shows before/after stats.
- [ ] Slow requests table shows per-endpoint latency data.
- [ ] Correlation view shows multi-metric context on chart click.
- [ ] Build OK (`ng build` passes).
