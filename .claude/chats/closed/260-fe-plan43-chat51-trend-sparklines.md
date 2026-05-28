# Brief 260 — P43 Chat 5.1 FE: consume 3 trend endpoints for monitoring detail sparklines

> **Origen**: Educa.API chat 258 · commit 1c895b5a · 2026-05-28
> **Plan**: [xrepo-43 §Chat 5.1](../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md)
> **Fase**: F5 — Visualizaciones
> **Parallel with**: Brief 258 (BE — shipped)

## MODO SUGERIDO

`/execute` — endpoints are live, FE just needs to consume.

## CONTEXTO DEL CAMBIO

BE shipped 3 new trend endpoints (brief 258). All return `List<TrendPuntoDto>` with shape `{ fecha: "yyyy-MM-dd", count: number }`, always N elements (default 30), gaps filled with 0, chronological ascending.

## ENDPOINTS DISPONIBLES

| Endpoint | Ruta |
|---|---|
| Blacklist trend | `GET /api/sistema/email-blacklist/trend?days=30` |
| Quarantine trend | `GET /api/sistema/email-outbox/quarantine/trend?days=30` |
| Defer events trend | `GET /api/sistema/email-outbox/defer-events/trend?days=30` |

**Query param**: `days` (optional, default 30, max 90, ≤0 → 400).
**Response**: `ApiResponse<TrendPuntoDto[]>` — same wrapper as all other endpoints.
**Cache**: 10min server-side — no client-side cache needed.
**Rate limiting**: `concurrency:reports` bulkhead (503 if saturated).

## IMPACTO EN ESTE REPO

- Add service methods to call the 3 endpoints.
- Add sparkline components to Blacklist, Quarantine, and DeferEvent detail pages.
- Follow the existing pattern from the Bandeja detail page (`serie-temporal`).

## CIERRE

**Duplicado de brief 259** — cerrado sin trabajo. El commit `76fb2b7c` (brief 259, mismo día) ya implementó el scope completo: sparklines de trend 30d en Blacklist, Quarantine, Defer Events y Bandeja KPI cards. Este brief fue generado por el chat BE (258) sin saber que el FE (259) ya estaba en vuelo.

**Fecha cierre**: 2026-05-28 · sin-op
