# 346 — Fix frontend performance anti-patterns from audit

> **Repos afectados**: `educa-web`
> **Plan**: standalone (audit-driven, no cross-repo plan needed)
> **Created**: 2026-06-25 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: `false`
> **modules**: `cross-cutting` (touches multiple feature modules)
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/**`, `src/app/core/services/**`, `src/app/app.ts`

## Context

Performance audit ran 5 parallel agents across the entire educa-web codebase on 2026-06-25, covering: DOM size, main-thread blocking, memory leaks, re-renders, and bundle size. Architecture is solid (313/314 OnPush, granular PrimeNG imports, excellent lazy loading). Problems are localized, not systemic.

**Work on branch `perf/346-fe-performance-fixes` from `main`.**

A parallel learning chat in educa-coord covers the theory behind each fix — execute the solutions here. Approach quality will be reviewed once theory is consolidated.

## Scope

### Phase 1 — Critical DOM (biggest user-visible impact)

1. **Attendance matrix virtualization** (`reports-result.component.html`)
   - 3 matrices (students × days, professors × days, staff × days) render 19,200+ DOM nodes without pagination or virtual scroll
   - Fix: paginate by student (10-20 rows per page) OR use `cdk-virtual-scroll-viewport`
   - The non-matrix fallback already has `[paginator]="true" [rows]="10"` — apply same to matrix view

2. **Student files dialog** (`student-files-dialog.component.html`)
   - Triple loop (weeks → students → files) = 7,500+ nodes
   - Fix: accordion by week (expand one at a time) or lazy-load by week

3. **Scrollable tables without virtual scroll** (17 correlation/email-outbox tables)
   - Fix: add `[virtualScroll]="true" [virtualScrollItemSize]="48"` to p-table instances with 100+ potential rows

### Phase 2 — Main thread blocking

4. **A* pathfinding sort** (`pathfinding.helper.ts:99`)
   - `openSet.sort()` O(n log n) per iteration inside the A* loop
   - Fix: replace with binary heap (priority queue) — O(log n) insertion

5. **Constructor blocking init** (`app.ts:29-31`)
   - `cacheVersionManager.initialize()` and `capacitor.initialize()` run synchronously in constructor
   - Fix: move to `ngOnInit` or `afterNextRender`

6. **Debug console.log in production** (`attendances.component.ts:314,323`)
   - `console.log('[DEBUG CrossChex Pagination]', res)` serializes large responses
   - Fix: remove or wrap in `isDevMode()` guard

### Phase 3 — Memory leaks

7. **Service worker listeners** (`sw.service.ts:46,51`)
   - `window.addEventListener('online'/'offline')` never removed
   - Fix: store refs, remove in `destroyRef.onDestroy()` or service teardown

8. **SignalR subjects never completed** (`signalr.service.ts:41-42`)
   - Two Subjects emit forever, never `.complete()`
   - Fix: complete in service teardown/disconnect

9. **Error reporter SW listener** (`error-reporter.service.ts:281`)
   - `navigator.serviceWorker.addEventListener('message')` never removed
   - Fix: store handler ref, remove in `destroyRef.onDestroy()`

### Phase 4 — Re-render hygiene

10. **`@for track $index` on real data** (33 instances across 36 files)
    - Fix: replace with stable identity (`track item.id`, `track day.fecha`, etc.)
    - Skip placeholders/skeletons — those are fine with `$index`

11. **Method calls in hot templates** (~15 instances)
    - `getCount()`, `getAlertLevel()`, `asError()`, `formatJson()`, etc.
    - Fix: convert to `computed()` signals

## Out of scope

- Bundle size optimizations (public page preloading, icon consolidation) — low impact, defer
- PrimeNG theme payload analysis — depends on Angular 22 migration
- New features or refactors beyond the specific anti-patterns listed
- Architecture changes — the base is solid, these are surgical fixes

## Pre-work

- Create feature branch from `main`: `perf/346-fe-performance-fixes`
- Read this brief fully before starting — phases are prioritized by user impact

## Criterio de cierre

- [x] Phase 1: matrix paginated (15 rows/page), student-files accordion (lazy by week)
- [x] Phase 2: console.log → logger, pathfinding linear min-extract, app init afterNextRender
- [x] Phase 3: SW listeners as arrow fields, error-reporter handler extracted
- [x] Phase 4: 4 track $index → stable identity, 5 files @let caching method calls
- [x] FE: lint + build OK
- [ ] Manual verification: attendance reports page loads without freeze

## Tiempo estimado

~120 min (4 phases × ~30 min each).
