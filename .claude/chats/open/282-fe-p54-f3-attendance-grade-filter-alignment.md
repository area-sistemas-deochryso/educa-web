# 282 — P54 F3: FE attendance grade filter alignment

> **Created**: 2026-06-01
> **Plan**: P54 — Attendance grade filter coherence
> **Phase**: F3 — FE filter alignment
> **Repo**: educa-web
> **Suggested mode**: `/investigate` then `/execute` (need to map affected dropdowns first)
> **Parallel**: yes — different module than 281 (personas). Use `/wt-new` for isolation.

## Context

F1 (investigation) ✅. F2 (BE enforcement) ✅ shipped (brief 273).

The BE now filters `ObtenerSalonesSedeAsync` to only return grades within the valid attendance range (≥ `AsistenciaGrados.UmbralGradoAsistenciaDiaria`, constant = 8, corresponding to 5° primaria through 5° secundaria). All other attendance data queries already respected the range.

## Scope

Ensure FE dropdowns in the "Seguimiento de asistencia" module only show grades within the valid range. Since BE is already filtered post-F2, this is **defense-in-depth** — the FE should:

1. Consume filtered data from BE (primary path — should already work if BE is the source)
2. Add client-side filtering as a safety net if any dropdown sources bypass the filtered endpoint

## Phase 1: Investigate (~15 min)

1. **Map all grade filter dropdowns** in the seguimiento module — which components render them?
2. **Trace data source** for each dropdown — does it call the now-filtered `ObtenerSalonesSedeAsync` or a different endpoint?
3. **Check if problem still exists** — if all dropdowns source from the filtered endpoint, F2 may have already fixed the FE without code changes

## Phase 2: Execute (if needed)

- For dropdowns that source from unfiltered endpoints: add client-side grade range filter
- For dropdowns already consuming filtered data: verify and close (no code change needed)

## Acceptance criteria

- [ ] No grade filter dropdown in seguimiento shows grades outside 5°pri–5°sec range
- [ ] Defense-in-depth: FE filters even if BE data includes out-of-range grades
- [ ] No regression in other modules that legitimately show all grades

## Out of scope

- Changing the grade range itself (business decision)
- Admin module grade filters (different module)
- Cleanup of existing attendance records for out-of-range grades
