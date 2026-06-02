# 285 — P43 F5:5.2 FE: Heatmap temporal + telemetry bundle in error reports

> **Created**: 2026-06-02
> **Plan**: P43 — Monitoreo: Cowork feedback producción
> **Phase**: F5, Chat 5.2 — Heatmap + bundle telemetría (B9, B10)
> **Repo**: educa-web (FE) — BE brief 261 ✅ closed (endpoints ready)
> **Suggested mode**: `/execute` (design complete in brief 260, coord)
> **Parallel**: yes — monitoreo module, no overlap with 284 (email) or 286 (crosschex BE).

## Context

F1-F4 ✅ all shipped. F5:5.1 (trend 30d sparklines) ⏳. F5:5.2 BE ✅ closed (brief 261, Educa.API — heatmap endpoint + telemetry bundle persist).

Design decisions (from brief 260):
- **D3**: count + avgDuration (not p95 — ErrorLogTrace only has error request durations)
- **D4**: HTML table + CSS color scale (no D3.js/Chart.js)
- **D5**: `GET /error-monitoreo/heatmap` → 168 cells (24h × 7d)
- **D7-D10**: telemetry bundle = breadcrumbs + requestIds + viewport + screen + dpr + connectionType, captured at dialog open

## Scope

1. **Heatmap component**: standalone OnPush component rendering 24×7 grid with CSS `color-mix` based on count intensity. Tooltip per cell with count + avgDuration.
2. **Telemetry bundle capture**: on error detail dialog open, capture browser context (viewport, screen, dpr, connectionType, recent breadcrumbs) and attach to report.
3. **Integrate** with existing monitoreo incidencias page.
4. **Investigate current state first** — verify BE endpoint shape and FE monitoreo page structure before implementing.

## Acceptance criteria

- [ ] Heatmap renders 168 cells with color intensity proportional to error count
- [ ] Tooltip shows count + avg duration per cell
- [ ] Telemetry bundle captured and displayed in error detail view
- [ ] Responsive (collapses gracefully on mobile)
- [ ] Tests for heatmap rendering + bundle capture
- [ ] Build + lint clean
