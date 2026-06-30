# 372 — P73 F2: Template method calls → computed signals

> **Created**: 2026-06-27
> **Plan**: [xrepo-73-platform-hygiene-audit.md](../../../../educa-coord/plans/xrepo-73-platform-hygiene-audit.md) F2
> **Repo**: educa-web
> **Modo sugerido**: /execute (pattern clear, 4 components identified)

## Context

Audit session 2026-06-25 identified template method calls as the dominant FE performance anti-pattern. These methods re-execute on every change detection cycle, causing unnecessary recomputation especially inside `@for` loops.

## Scope — 4 components, priority order

### 1. `salon-notas-tab.component` (profesor) — CRITICAL
- **Path**: `src/app/features/intranet/pages/profesor/classrooms/components/salon-notas-tab/`
- **Methods**: `getPromedio(estudianteId, periodo)`, `getNota()`, `formatNota()`, `getNotaSeverity()`
- **Heat**: Nested `@for` (students × evaluation groups × evaluations). Worst perf-per-call.
- **Fix**: `getPromedio` → lookup into existing `promediosLookup` computed signal. Other methods → computed maps keyed by student+evaluation.
- **Signals**: Already uses computed (promediosLookup, notasLookup). Migration-ready.

### 2. `campus-editor.component` — HIGH (36 calls)
- **Path**: `src/app/features/intranet/pages/admin/campus/components/campus-editor/`
- **Methods**: `getNodeX()`, `getNodeY()`, `getNodeColor()`, `getNodeLabel()`, `getBloqueoX()`, `getBloqueoY()`
- **Heat**: Called inside `@for` over nodos × aristas × bloqueos. SVG re-renders on any CD.
- **Fix**: `getNodeX/Y` → computed map from `nodoMap` signal. Already has signal infrastructure.

### 3. `error-occurrence-drawer.component` — MEDIUM (15 calls, easy win)
- **Path**: `src/app/features/intranet/pages/admin/error-groups/components/error-occurrence-drawer/`
- **Methods**: `getOrigenLabel()`, `getTraceCapaLabel()`, `getStatusClass()`, format helpers
- **Fix**: Computed maps. Full signal architecture already in place (vm computed pattern).

### 4. `runtime-health-widget.component` — LOW (admin-only, 18 calls)
- **Path**: `src/app/features/intranet/pages/admin/sistema/runtime-health/components/runtime-health-widget/`
- **Methods**: `getMetricLabel()`, format helpers, `evaluateThresholds()`
- **Fix**: Already uses computed extensively. Remaining methods → computed.

## Additional hot spots (from 346 investigation, NOT in pre-release)

These are in main and NOT covered by the pre-release/v1.1.0 branch:
- `calificaciones-panel.component.html` (lines 59-73): `getPesoPercent()`, `getNotasCount()`, `getPromedio()`
- `summary-modal.component.html` (lines 24-35): `getCourseCount()`, `getTotalAttendance()`
- `profesor-horarios.component.html` (lines 133-134): `getBlockStyle()`, `getTooltipContent()` in nested loops

Include these if time allows; the 4 primary components are the must-do.

## Pattern

For each component:
1. Identify which template method is called and what data it derives from
2. Create a `computed()` signal (or computed map for keyed lookups) that pre-computes the same value
3. Replace template method call with signal read
4. Verify with `ng build` (no runtime test needed — pure computation migration)

## Validation

- `ng build --configuration=production` must pass
- Spot-check affected pages in dev server (notas tab, campus editor)

## Relations

- **346**: Already executed in `pre-release/v1.1.0` (merge gate). This brief covers what 346 did NOT touch.
- **358**: This brief IS the materialization of 358's scope, expanded with additional hot spots.

## Learnings from investigation

- All `@for` loops already have `track` — no trackBy issues
- 218 `.subscribe()` calls but managed via `DestroyRef`/`takeUntilDestroyed` — low risk
- The project has fully migrated from `*ngFor` to `@for`
