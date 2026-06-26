# Brief 262 — P43 Chat 5.2 FE: Error heatmap component + telemetry bundle capture & render

> **Created**: 2026-05-28
> **Plan**: [xrepo-43 §Chat 5.2](../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md)
> **Design**: [brief 260](../../../educa-coord/.claude/chats/closed/260-xrepo-plan43-chat52-heatmap-telemetry-design.md)
> **Fase**: F5 — Visualizaciones
> **Puntos cierra**: B9 (FE half), B10 (FE half)
> **Parallel with**: Brief 261 (BE)

## MODO SUGERIDO

`/execute` — design is closed in brief 260.

## Context

Two FE features: (1) an error heatmap visualization showing when errors cluster (DOW × hour grid), and (2) telemetry bundle capture in the feedback report dialog + rendering in the admin detail view.

## Scope

### 1. Error heatmap component + page integration (B9)

**New component: `<app-error-heatmap>`**
- Location: `intranet/pages/admin/error-groups/components/error-heatmap/`
- Input: `cells: HeatmapCellDto[]` (168 elements)
- Render: HTML `<table>` with 7 rows (Lun–Dom) × 24 cols (00–23)
- Cell color: interpolate from white (0) → orange (median) → red (max count)
- Tooltip on hover: "Lunes 14:00 — 23 errores, ~450ms promedio"
- Accessible: `aria-label` per cell, `role="grid"`

**DTO:**
```typescript
interface HeatmapCellDto {
  dayOfWeek: number;  // 0=Dom, 1=Lun, ..., 6=Sab
  hour: number;       // 0-23
  count: number;
  avgDurationMs: number;
}
```

**Service method:**
```typescript
getHeatmap(days = 30, endpoint?: string): Observable<HeatmapCellDto[]>
```
Endpoint: `GET /api/sistema/error-monitoreo/heatmap?days={days}&endpoint={endpoint}`

**Page integration:**
- New tab "Análisis temporal" in error-groups page (sibling to table/kanban views)
- Above heatmap: endpoint selector dropdown (populated from existing error groups' distinct URLs)
- Below heatmap: legend bar (color scale) + summary text ("Pico: Lunes 14:00 con N errores")

### 2. Telemetry bundle capture (B10 — dialog side)

**Modify `FeedbackReportDialog`:**
- On dialog open (`ngOnInit` or `onShow`): capture telemetry snapshot
- Snapshot structure:

```typescript
interface TelemetryBundle {
  breadcrumbs: Breadcrumb[];        // from ActivityTrackerService (max 30)
  recentRequestIds: string[];       // from RequestTraceFacade (max 5)
  viewport: { width: number; height: number };
  screen: { width: number; height: number };
  devicePixelRatio: number;
  connectionType: string | null;    // navigator.connection?.effectiveType ?? null
  capturedAt: string;               // new Date().toISOString()
}
```

- Serialize as JSON string, send as `telemetryBundle` field in POST payload
- ActivityTrackerService already injected or injectable — get breadcrumbs via public method
- RequestTraceFacade already injected — get recent IDs

**New helper (pure function):**
```typescript
// intranet/shared/utils/telemetry-snapshot.ts
export function captureTelemetrySnapshot(
  activityTracker: ActivityTrackerService,
  requestTrace: RequestTraceFacade
): TelemetryBundle { ... }
```

### 3. Telemetry bundle render (B10 — admin detail side)

**Modify feedback-reports detail drawer:**
- New collapsible section "Telemetría" (below existing fields, above observations)
- Only visible if `reporte.telemetryBundle` is non-null
- Parse JSON → render:

**Timeline subsection:**
- Chronological list of breadcrumbs
- Icon per type: 🔗 NAVIGATION, ✅ API_CALL (status < 400), ❌ API_ERROR (status >= 400)
- Each row: `[icon] [timestamp HH:mm:ss] [description] [durationMs if API]`
- Max 30 items (the ring buffer limit)

**Device info subsection:**
- Single line: `Viewport: 1920×1080 · Screen: 1920×1080 · DPR: 2 · Connection: 4g`

**Correlation link:**
- If `reporte.correlationId` exists, show "Ver en Hub de Correlación" link → `/intranet/admin/monitoreo?correlationId={id}`

## Pre-work

- Read `error-groups.component.ts` (current view switching logic — table/kanban)
- Read `feedback-report-dialog.component.ts` (current submission flow)
- Read `feedback-reports.component.ts` (current detail drawer structure)
- Read `activity-tracker.service.ts` (public API for getting breadcrumbs)
- Read `request-trace.facade.ts` (public API for getting request IDs)

## Out of scope

- BE heatmap endpoint (brief 261)
- BE telemetry column migration (brief 261)
- p95 latency display (deferred — avgDuration in tooltip is the MVP)
- Heatmap in monitoring hub tiles (D2: detail pages only)

## Criteria

- [ ] `<app-error-heatmap>` renders 7×24 grid with color interpolation
- [ ] New "Análisis temporal" tab visible in error-groups page
- [ ] Endpoint selector filters heatmap data
- [ ] FeedbackReportDialog captures telemetry snapshot on open
- [ ] POST payload includes telemetryBundle (verified in Network tab)
- [ ] Admin detail drawer shows telemetry section when bundle exists
- [ ] Breadcrumb timeline renders chronologically with correct icons
- [ ] lint + build OK
- [ ] Behavior verified in browser (dev server)

## Estimated time

~40 min.
