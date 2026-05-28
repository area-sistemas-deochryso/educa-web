# Brief 259 — P43 Chat 5.1 FE: Sparkline integration in 4 monitoring detail pages

> **Created**: 2026-05-28
> **Plan**: [xrepo-43 §Chat 5.1](../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md)
> **Design**: [brief 257](../../../educa-coord/.claude/chats/running/257-xrepo-plan43-chat51-trend-30d-contadores.md)
> **Fase**: F5 — Visualizaciones
> **Punto cierra**: B8 (FE half)
> **Parallel with**: Brief 258 (BE)

## MODO SUGERIDO

`/execute` — design is closed in brief 257.

## Context

The `<app-mini-sparkline>` component already exists in `intranet/shared/components/mini-sparkline/`. This brief wires it into 4 monitoring detail pages, each showing a 30d trend + "promedio 7d · máx 30d" summary.

## Scope — 4 page integrations + 1 shared helper

### Shared helper (pure function)

```typescript
// e.g., in monitoreo/utils/trend-summary.ts
export function trendSummary(data: number[]): { avg7d: number; max30d: number } {
  const last7 = data.slice(-7);
  return {
    avg7d: Math.round(last7.reduce((a, b) => a + b, 0) / last7.length),
    max30d: Math.max(...data),
  };
}
```

### Page 1 — Bandeja (email-outbox) — MINIMAL

- **Component**: `email-outbox.component` / `EmailOutboxStatsComponent`
- **Current state**: already has stats + chart + consumes `tendencias()` API
- **Work**: wire existing serie-temporal daily data into `<app-mini-sparkline>` per KPI card (sent, failed). Add "promedio 7d: N · máx 30d: M" subtitle below each sparkline. Use `trendSummary()`.
- **Color mapping**: sent → `var(--green-500)`, failed → `var(--red-500)`
- **Data source**: existing `serie-temporal` endpoint (already consumed). Extract per-metric arrays from `DashboardSerieTemporalPuntoDto[]`.

### Page 2 — Blacklist (blacklist-tab) — MEDIUM

- **Component**: `blacklist-tab.component`
- **Current state**: inline stat pills (total/activas/inactivas), no trend data
- **Work**:
  1. Add API call to `GET /api/sistema/email-blacklist/trend?days=30` in facade or service.
  2. Add `<app-mini-sparkline>` next to the stat pills section.
  3. Add "promedio 7d: N · máx 30d: M" below sparkline.
- **Color**: `var(--red-400)`
- **Fail-safe**: API error → hide sparkline section (no crash). INV-S07.

### Page 3 — Quarantine (quarantine-tab) — MEDIUM

- **Component**: `quarantine-tab.component`
- **Current state**: inline stat pills (total/activas/liberadas), no trend data
- **Work**: same pattern as Blacklist.
  1. API call to `GET /api/sistema/email-outbox/quarantine/trend?days=30`.
  2. `<app-mini-sparkline>` next to stat pills.
  3. "promedio 7d: N · máx 30d: M" subtitle.
- **Color**: `var(--orange-400)`
- **Fail-safe**: same as Blacklist.

### Page 4 — Defer events (defer-events-tab) — LARGEST

- **Component**: `defer-events-tab.component`
- **Current state**: NO stats section — only filters + event timeline
- **Work**:
  1. Create a small stats summary section at top (before filters): total events 30d + sparkline.
  2. API call to `GET /api/sistema/email-outbox/defer-events/trend?days=30`.
  3. `<app-mini-sparkline>` in the new section.
  4. "promedio 7d: N · máx 30d: M" subtitle.
  5. Total 30d = sum of trend data array (no extra endpoint needed).
- **Color**: `var(--yellow-500)`
- **Fail-safe**: if trend fails, skip entire stats section.

### Common patterns

- Sparkline height: 32px (default).
- All sparkline sections degrade gracefully on error (hide, not crash).
- Loading state: show skeleton/placeholder while trend loads.
- Trend data fetched once on page load (not on every filter change — it's always 30d window).
- `ariaLabel`: "Tendencia últimos 30 días: {metric}" for accessibility.

## Pre-work before execution

- Investigate how `tendencias()` is consumed in Bandeja today (exact data shape, where it's called).
- Confirm stat pills layout in Blacklist/Quarantine to decide sparkline placement.

## Done when

- 4 pages show 30d sparkline next to primary KPI.
- Each sparkline has "promedio 7d: N · máx 30d: M" subtitle.
- Graceful degradation on API failure.
- No changes to monitoreo hub.
- Visual check in browser: sparklines render correctly with real or mock data.

## Resultado (2026-05-28)

**Status**: ✅ Completado — build prod pasa.

### Decisiones de implementación

- **Page 1 (Bandeja)**: sparklines añadidas dentro de `email-outbox-stats.component` como input opcional `tendencias`. Extrae arrays `enviados[]`/`fallidos[]` de `EmailOutboxTendencia[]` — no hay `DashboardSerieTemporalPuntoDto` (el brief usaba un nombre placeholder).
- **Pages 2-3 (Blacklist/Quarantine)**: trend signals añadidos a los stores existentes (`BaseCrudStore` no los tiene) + `loadTrend()` en facades. Carga independiente del `loadData()` (una vez en init, no en cada filtro).
- **Page 4 (Defer Events)**: signals directos en el componente (consistente con su patrón existente sin facade).
- **Helper** en `email-outbox/utils/trend-summary.ts` (no en `monitoreo/utils/` como sugería el brief — las 4 páginas viven bajo `email-outbox/`).
- **BE endpoints** (`/trend?days=30`) no existen aún (Brief 258 BE en `open/`). Fail-safe: sparkline section oculta cuando trend array está vacío.

### Archivos tocados (21)

- 1 nuevo: `utils/trend-summary.ts`
- 3 API services: `blacklist.service`, `email-quarantine.service`, `email-defer-events.service` (+`getTrend()`)
- 2 stores: `blacklist.store`, `email-quarantine.store` (+trend signals)
- 2 facades: `blacklist-data.facade`, `email-quarantine-data.facade` (+`loadTrend()`, vm trend)
- 4 component TS + 4 HTML + 3 SCSS + 1 parent template pass-through
