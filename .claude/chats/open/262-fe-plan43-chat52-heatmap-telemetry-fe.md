# Brief 262 — P43 Chat 5.2 FE: Error heatmap component + telemetry bundle capture & render

> **Created**: 2026-05-28
> **Plan**: [xrepo-43 §Chat 5.2](../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md)
> **Design**: inline in plan (designed 2026-05-28, decisions D3-D10)
> **BE companion**: [brief 261](../../../Educa.API/.claude/chats/closed/261-be-plan43-chat52-heatmap-telemetry-bundle.md) — ✅ closed
> **Fase**: F5 — Visualizaciones
> **Puntos cierra**: B9 (FE half), B10 (FE half)

## MODO SUGERIDO

`/execute` — design closed, BE endpoints ready.

## Context

Two FE features completing the P43 F5 visualization phase:

1. **B9 — Error heatmap** (DOW × hour): consumes `GET /error-monitoreo/heatmap` (168 cells with count + avgDuration). Renders as HTML table with CSS color scale (design decision D4: no D3.js/Chart.js). New tab "Análisis temporal" in error monitoring.

2. **B10 — Telemetry bundle** capture + render in user feedback reports: capture client context (breadcrumbs, requestIds, viewport, screen, dpr, connectionType) at dialog open; send as JSON in `telemetryBundle` field on report creation; render as timeline in report detail.

## Design decisions (from plan D3-D10)

- **D3**: Metrics = `count` + `avgDuration` (not p95 — ErrorLogTrace only has error request durations)
- **D4**: HTML `<table>` + CSS `background-color` scale (no D3/Chart.js dependency)
- **D5**: `GET /error-monitoreo/heatmap` → 168 cells (7 DOW × 24 hours)
- **D7-D10**: Telemetry bundle = breadcrumbs + requestIds + viewport + screen + dpr + connectionType, captured at dialog open

## Scope

### 1. Error heatmap component (B9)

**Service/facade work:**
- Call `GET /api/sistema/error-monitoreo/heatmap?days=30&endpoint={urlPattern?}`
- Map response `HeatmapCellDto[]` (168 elements) into 7×24 grid

**Component: `error-heatmap`**
- HTML table: rows = DOW (Lun-Dom), cols = hours (0-23)
- Each cell: `background-color` interpolated from min→max count (CSS custom properties or inline style)
- Tooltip on hover: "Lunes 14h — N errores, avg Xms"
- Selector de endpoint (dropdown or autocomplete from known URL patterns)
- `days` param: default 30, options 7/14/30

**Integration:**
- New tab "Análisis temporal" in error monitoring section (`/intranet/admin/monitoreo/errores`)
- Lazy loaded, only fetches on tab activation

**Graceful degradation (INV-S07):** empty state message if all cells are 0 or API error.

### 2. Telemetry bundle capture + render (B10)

**Capture (at FeedbackReportDialog open):**
- Collect from available sources:
  - `breadcrumbs`: last 10 router navigation events (from `Router.events` or `RequestTraceFacade`)
  - `requestIds`: last 5 correlation IDs from recent API calls
  - `viewport`: `window.innerWidth × window.innerHeight`
  - `screen`: `screen.width × screen.height`
  - `dpr`: `window.devicePixelRatio`
  - `connectionType`: `navigator.connection?.effectiveType` (nullable)
- Serialize as JSON, attach to `CrearReporteUsuarioDto.telemetryBundle`

**Render (in report detail):**
- Parse `telemetryBundle` JSON from `ReporteUsuarioDetalleDto`
- Display as structured card: breadcrumb timeline + device info grid + requestId chips (link to correlation hub if available)
- Null-safe: if bundle is null (old reports), show nothing

**Privacy note (plan risk #4):** no PII in bundle — breadcrumbs are URL paths (no query params with user data), requestIds are GUIDs. Audit captured fields before persisting.

## Pre-work

- Investigate current error monitoring page structure (tabs, routing, lazy loading pattern)
- Investigate `FeedbackReportDialog` — current create flow, where to inject capture
- Investigate `ReporteUsuarioDetalleDto` — where detail renders, how to add bundle section
- Read `RequestTraceFacade` or equivalent for correlation ID access
- Read BE brief 261 outcome for exact endpoint contract

## Out of scope

- BE endpoints (brief 261, already closed)
- p95/percentile visualizations (deferred)
- Heatmap for non-error metrics (future)

## Criteria

- [ ] Tab "Análisis temporal" renders 7×24 heatmap with color scale
- [ ] Endpoint selector filters heatmap data
- [ ] Tooltip shows count + avg duration per cell
- [ ] Empty state on API error / no data (INV-S07)
- [ ] FeedbackReportDialog captures telemetry bundle at open
- [ ] Report detail renders bundle as structured card
- [ ] Old reports (null bundle) render cleanly
- [ ] No PII in captured bundle
- [ ] Build + existing tests pass

## Estimated time

~45 min.

<!-- minimal-from-go -->
