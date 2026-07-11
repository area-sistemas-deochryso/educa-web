# 330 — Runtime Health: persistence, historical trends, alerts, diagnostics

> **Repos afectados**: `educa-web`, `Educa.API`
> **Plan**: none (design defined in this brief)
> **Creado**: 2026-06-17 · **Estado**: ✅ F2 shipped (FE history UI).
> **Validación prod**: ⏳ pendiente desde 2026-06-18 — verificar charts con datos reales del endpoint `/history`.
> **MODO SUGERIDO**: `/design` then `/execute`
> **exclusive**: `false`
> **modules**: `runtime-health`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/sistema/runtime-health/**`
>   - `Educa.API`: `Controllers/Sistema/RuntimeHealthController.cs`, `Services/Sistema/RuntimeHealthService.cs`, `Data/ApplicationDbContext.cs`, `Helpers/Diagnostics/**`

## Problem Statement

The runtime health page (`/intranet/admin/sistema/runtime-health`) is read-only — it shows a live snapshot but:

1. **No history**: you must be watching at the exact moment something goes wrong.
2. **No aggregations**: no min, avg, max — just raw instant values.
3. **No alerts/recommendations**: no way to know if a value is abnormal without memorizing what "normal" looks like.
4. **No actions**: when something IS wrong, there's nothing you can do from the UI.

Target user: only the dev/admin (same `ADMIN_SISTEMA_RUNTIME_HEALTH` capability that already exists).

## Existing BE Architecture

- `RuntimeHealthService` collects live snapshot (ThreadPool + GC + Requests + BD).
- `RequestPercentileTracker` — 5-min sliding window, p50/p95/p99 in memory.
- `SqlClientCounterListener` — EventSource counters for DB connections.
- `SaturationClassifier` — classifies pattern: OK, STARVATION, EXTERNAL_BOTTLENECK, OVERLOAD.
- 10-second IMemoryCache TTL on snapshots.
- OpenTelemetry exports to Azure Application Insights (production only).
- **NO local persistence** — snapshots are transient.

## Design Parameters (confirmed with user)

- **Snapshot interval**: every 30 seconds (Hangfire recurring job).
- **Retention**: 7 days, then auto-purge (cleanup job).
- **Volume**: ~2,880 rows/day, ~20k rows/week — trivial for SQL Server.
- **Access control**: same capability (`ADMIN_SISTEMA_RUNTIME_HEALTH`), no extra roles.

## Phases

### Phase 1 — Persistence layer (BE only)

**Goal**: snapshots stored every 30s, queryable, auto-purged after 7 days.

#### BE changes:
- **New entity** `RuntimeHealthSnapshot` in `Data/Entities/Sistema/`:
  - `Id` (int, PK auto-increment)
  - `Timestamp` (DateTimeOffset, indexed)
  - ThreadPool: `WorkersBusy`, `WorkersMax`, `IoBusy`, `IoMax`, `QueueLength`, `CompletedTotal`
  - Requests: `InFlight`, `P50Ms`, `P95Ms`, `P99Ms`, `Last5MinCount`
  - DB: `ActiveConnections`, `PooledConnections`, `P95LatencyMs`
  - GC: `Gen0`, `Gen1`, `Gen2`, `HeapMb`, `TotalAllocatedMb`
  - `SaturationPattern` (string: OK/STARVATION/EXTERNAL_BOTTLENECK/OVERLOAD/UNKNOWN)
  - `Reason` (string, nullable — classifier reason text)

- **DbContext**: add `DbSet<RuntimeHealthSnapshot>`.
- **Migration**: create table `RuntimeHealthSnapshots` with index on `Timestamp DESC`.

- **Hangfire recurring job** `RuntimeHealthRecorderJob`:
  - Runs every 30 seconds.
  - Calls `RuntimeHealthService.GetSnapshot()`, maps to entity, saves.
  - Fail-safe: if collection fails, skip (don't persist UNKNOWN rows unless classifier says UNKNOWN).

- **Hangfire cleanup job** `RuntimeHealthCleanupJob`:
  - Runs daily.
  - Deletes rows older than 7 days.

- **New endpoint** `GET /api/sistema/runtime-health/history`:
  - Query params: `from` (DateTimeOffset), `to` (DateTimeOffset), `resolution` (enum: raw/1min/5min/15min/1h).
  - For `raw`: return all snapshots in range (max 1000, paginated).
  - For aggregated resolutions: return `MIN`, `AVG`, `MAX` per metric per bucket.
  - Same capability requirement.

### Phase 2 — Historical trends UI (FE + minor BE)

**Goal**: the page shows trends over time with min/avg/max.

#### FE changes:
- **New component** `runtime-health-history` with time-range selector (last 30min, 1h, 6h, 24h, 7d).
- **Charts**: one chart per metric group (ThreadPool, Requests, BD, GC) using a lightweight chart library (PrimeNG has `p-chart` with Chart.js).
- **Aggregation display**: below each chart, show min/avg/max for the selected period.
- **Current snapshot** stays at the top (existing behavior), history below.
- Resolution auto-selected: <1h → raw, 1-6h → 1min, 6-24h → 5min, 1-7d → 1h.

### Phase 3 — Alerts & thresholds (FE + BE)

**Goal**: configurable thresholds with visual indicators and anomaly detection.

#### BE changes:
- **New table** `RuntimeHealthThreshold`:
  - `MetricKey` (string PK, e.g. "requests.p95", "db.activeConnections")
  - `WarnValue` (decimal)
  - `CriticalValue` (decimal)
  - `Direction` (enum: above/below — "above 800ms is bad" vs "below 2 workers is bad")
- **Evaluation logic** in the recorder job: after persisting snapshot, evaluate against thresholds. If breached, flag the snapshot row (`AlertLevel`: null/warn/critical).
- **New endpoint** `GET /api/sistema/runtime-health/alerts` — returns recent threshold breaches.
- **New endpoint** `PUT /api/sistema/runtime-health/thresholds` — update threshold config.

#### FE changes:
- **Threshold config panel**: editable table of metrics with warn/critical values.
- **Visual indicators** on the live snapshot: green/yellow/red per metric based on thresholds.
- **Alert timeline**: list of recent breaches with timestamp, metric, value, threshold.
- **Recommendations**: when a threshold is breached, show a contextual suggestion (e.g. "p95 > 2000ms — check slow queries" or "ThreadPool queue > 50 — possible starvation").

### Phase 4 — Diagnostics & actions (FE + BE)

**Goal**: drill-down into what's causing issues + operational actions.

#### BE changes:
- **New endpoint** `POST /api/sistema/runtime-health/force-gc` — calls `GC.Collect()` + `GC.WaitForPendingFinalizers()`. Logs the action. Returns before/after heap stats.
- **New endpoint** `GET /api/sistema/runtime-health/slow-requests` — returns top N slowest requests in the last 5 minutes from `RequestPercentileTracker` (needs tracker enhancement to store per-endpoint stats, not just global).
- **Tracker enhancement**: `RequestPercentileTracker` currently tracks global latency. Add per-endpoint tracking (top 20 endpoints by volume) to identify "culprits".

#### FE changes:
- **Action buttons** in the live snapshot panel: "Force GC" (with confirmation dialog showing current heap).
- **Slow requests table**: expandable section showing top slow endpoints with p50/p95/p99/count.
- **Correlation view**: when a metric spikes in the historical chart, clicking the spike shows what was happening at that time (other metrics, slow requests if available).

## Implementation order

Phase 1 → Phase 2 → Phase 3 → Phase 4. Each phase is independently deployable and useful.

Phase 1 is the foundation — nothing else works without it.

## Out of scope

- Push notifications (email/SMS) for alerts — future enhancement.
- Multi-server aggregation (single server deployment assumed).
- Custom dashboard builder.
- Integration with external monitoring (Grafana, Datadog).

## Criterio de cierre (Phase 1 — first worktree)

- [ ] BE: migration + entity + DbContext updated.
- [ ] BE: Hangfire recorder job runs every 30s, persists snapshots.
- [ ] BE: Hangfire cleanup job purges >7d rows.
- [ ] BE: `GET /history` endpoint returns raw + aggregated data.
- [ ] BE: build + tests OK.
- [ ] Manual verification: snapshots accumulate, cleanup works, endpoint returns data.

## Tiempo estimado

- Phase 1: ~90 min (BE only)
- Phase 2: ~120 min (FE charts + wiring)
- Phase 3: ~90 min (thresholds CRUD + evaluation)
- Phase 4: ~120 min (diagnostics, tracker enhancement, actions)
