> **Origen**: Educa.API chat 300 · commit cb3652c1 · 2026-06-03
> **Plan**: `educa-coord/plans/xrepo-75-heatmap-calendar-view.md`
> **Creado**: 2026-06-03 · **Chat**: 1 · **Estado**: ✅ shippeado.
> **MODO SUGERIDO**: `/execute` (design complete 2026-06-26)
> **exclusive**: `false`
> **Validación prod**: ⏳ pendiente desde 2026-06-30
> **modules**: monitoreo/heatmap

---

# Heatmap: consumir nuevo endpoint calendar + endDate

## CONTEXTO DEL CAMBIO

Educa.API ahora expone dos endpoints de heatmap:

1. `GET heatmap` — grilla semanal 7×24 (existente), ahora con `endDate` opcional.
2. `GET heatmap/calendar` — **nuevo**: una fila por día real. Response: `List<{ date, count, avgDurationMs }>`.

Ambos aceptan `days` (1-90, default 30), `endpoint` (filtro), `endDate` (default=hoy Perú).

## Design decisions (2026-06-26)

| Decision | Choice | Rationale |
|---|---|---|
| Integration layout | **Tabs** ("Semanal" default, "Calendario") | Internal tool — simplicity over simultaneous views |
| Calendar grid | Columns = day-of-week, rows = weeks of month, cells colored by `count` | Standard calendar heatmap (GitHub-style) |
| Navigation | Prev/next arrows on both tabs | Semanal navigates by week, calendario by month. Both use `endDate` param. |

## Scope

1. Add `heatmap/calendar` call to the heatmap service.
2. Add `endDate` param to existing `heatmap` service call.
3. Create calendar heatmap component (monthly grid: dow columns × week rows, color-mapped cells).
4. Add tab layout: "Semanal" (existing) | "Calendario" (new).
5. Add prev/next navigation arrows passing `endDate` to both endpoints.

## Out of scope

- Backend changes (endpoint already shipped).
- Modifying existing weekly heatmap internals.
- Tooltip/drill-down on calendar cells (future enhancement).

## Criterio de cierre

- [ ] FE: tabs render correctly, default to "Semanal".
- [ ] FE: calendar grid shows daily counts with color mapping.
- [ ] FE: prev/next navigation works on both tabs.
- [ ] FE: build + lint OK.

## Tiempo estimado

~60 min.
