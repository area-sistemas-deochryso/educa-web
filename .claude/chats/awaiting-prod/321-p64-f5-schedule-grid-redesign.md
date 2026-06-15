# 321 — P64 F5: Schedule grid redesign (H5) + validation indicators (H7 FE)

> **Repos afectados**: `educa-web`
> **Plan**: [xP64 — Admin horarios UX overhaul](../../../../educa-coord/plans/xrepo-64-admin-horarios-ux.md)
> **Creado**: 2026-06-15 · **Estado**: ✅ completado.
> **Validación prod**: ⏳ pendiente desde 2026-06-15
> **MODO SUGERIDO**: `/execute`
> **exclusive**: `false`
> **modules**: `schedules`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/schedules/**`

## Context

The current flat table view is fundamentally wrong for schedule data. Schedules are 2D (day × time) but the table flattens them to 1D rows. With 100+ horarios, it's impossible to audit completeness, find gaps, or spot conflicts.

## Approved design: entity-based grid view

Replace the flat table with a master-detail layout:

### Layout

- **Left panel**: entity list (salones or profesores) with completeness/conflict indicators
- **Right panel**: weekly grid for the selected entity (day columns × time rows)
- **3 view modes**: Por Salón, Por Profesor, Vista Global (problems summary)

### Grid interactions

- **Empty slot** → click to open creation dialog pre-filled with salón + día + hora from context
- **Filled slot** → click to open detail drawer (existing, improved in F3/F4)
- **Visual indicators**: sin profesor (⚠ warning), conflicto (🔴 error), completo (✓ success)

### Stats bar update

Replace current stats with actionable ones: Total, Activos, **Incompletos** (horarios sin profesor), **Conflictos** (from H7 validation).

### What to remove

- `SchedulesListViewComponent` (p-table) — replaced entirely by the grid
- The flat table actions column — actions move to detail drawer + cell context menu

### What to keep

- `SchedulesWeeklyViewComponent` — evaluate if it can be adapted as the grid base, or if a new component is cleaner
- Filter bar — salón/profesor filters become entity list navigation; día/estado filters stay as grid overlays
- `ScheduleDetailDrawerComponent` — unchanged, opens on cell click

## Dependencies

- **BE brief 322**: `validationStatus` field on `HorarioResponseDto` — needed for conflict/incomplete indicators. H5 grid works without it (just no validation badges), so FE can start immediately and wire indicators when BE is ready.

## Pre-work

- Read `schedules/README.md` for current component map
- Check `SchedulesWeeklyViewComponent` to evaluate reuse vs. new component
- Read `SchedulesFilterStore` to understand current filter state management

## Out of scope

- H1/H2/H3/H4 — already done in F2-F4
- Backend validation endpoint — separate brief 322
- Import dialog changes — import flow stays as-is

## Criterio de cierre

- [ ] "Por Salón" view: entity list + weekly grid renders correctly
- [ ] "Por Profesor" view: same layout grouped by professor
- [ ] "Vista Global" view: summary of problems (sin profesor, conflictos if BE ready)
- [ ] Click empty slot → creation dialog pre-filled with context
- [ ] Click filled slot → detail drawer opens
- [ ] Completeness indicators on entity list (X/Y bloques cubiertos)
- [ ] Old table view removed
- [ ] FE: lint + build OK, behavior verified in browser

## Tiempo estimado

~3-4 hours (large FE redesign, multiple new components).
