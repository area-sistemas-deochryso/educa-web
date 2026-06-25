# 347 — Refine performance fixes from 346 review

> **Repos afectados**: `educa-web`
> **Plan**: standalone (follow-up to brief 346)
> **Created**: 2026-06-25 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: `false`
> **modules**: `correlation`, `campus-navigation`, `attendance-reports`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/cross-role/campus-navigation/services/pathfinding.helper.ts`, `src/app/features/intranet/pages/admin/correlation/components/correlation-timeline-section/`, `src/app/features/intranet/pages/cross-role/attendance-reports/components/reports-result/reports-result.component.scss`

## Context

Brief 346 was executed and merged performance fixes. A theory-driven review identified 3 refinements where the execution chose a "good enough" solution over the optimal one. This brief applies the correct solutions.

**Work on branch `perf/347-perf-346-refinements` from `perf/346-fe-performance-fixes`.**

## Scope

### Fix 1 — Pathfinding: replace linear scan with binary min-heap

**File**: `pathfinding.helper.ts`

Brief 346 replaced `openSet.sort((a, b) => a.f - b.f)` with a linear scan (`for` loop finding minIdx). This is O(n) per iteration — better than O(n log n) sort but suboptimal.

**Replace with a proper MinHeap implementation:**
- Implement a `MinHeap<T>` class (or inline helper) with: `insert(node)` O(log n), `extractMin()` O(log n), `decreaseKey(id, newF)` O(log n)
- The heap compares by `.f` property (A* cost = g + h)
- Keep it internal to the file — no need for a shared utility
- The heap needs ~30-40 lines: array-backed, siftUp on insert, siftDown on extract
- `decreaseKey` is needed because A* updates g-scores for nodes already in the open set — without it, duplicate entries accumulate

**Expected gain**: O(log k) per iteration vs O(k). For current campus (~100 nodes, ~30 iterations, openSet ~40 elements): ~150 ops vs ~1,200. Matters if the campus graph grows.

### Fix 2 — Timeline: discriminated union instead of cast functions

**Files**: `correlation-timeline-section.component.html` + the `TimelineEvent` model

Brief 346 used `@let error = asError(event.payload)` to cache the cast — reduces calls from ~10 to 1 per case, but `asError()` still executes every CD cycle.

**Replace with a discriminated union type:**

```typescript
// Current (probable):
interface TimelineEvent {
  kind: 'error' | 'rate-limit' | 'reporte' | 'outbox';
  payload: unknown;  // or a base type
}

// Target:
type TimelineEvent =
  | { kind: 'error'; payload: ErrorPayload }
  | { kind: 'rate-limit'; payload: RateLimitPayload }
  | { kind: 'reporte'; payload: ReportePayload }
  | { kind: 'outbox'; payload: OutboxPayload };
```

With this type, `@switch (event.kind)` narrows `event.payload` automatically — no cast functions needed. Remove `asError()`, `asRateLimit()`, `asReporte()`, `asOutbox()` methods entirely.

**Steps:**
1. Check the actual `TimelineEvent` type definition — find where it lives
2. Refactor to discriminated union
3. Remove all `asX()` methods from the component
4. Remove `@let` + cast in template — access `event.payload.prop` directly
5. Verify TypeScript narrows correctly inside `@switch`/`@case`

### Fix 3 — Matrix table: add `table-layout: fixed`

**File**: `reports-result.component.scss`

Brief 346 added pagination (15 rows) but didn't add `table-layout: fixed`. The attendance matrix cells are all fixed-width (1-2 character codes: A, F, T, J) — no content will overflow.

**Add to `.matrix-table`:**
```scss
.matrix-table {
  table-layout: fixed;
}
```

This reduces Layout cost from O(rows × cols) to O(cols) — the browser only reads the first row to determine column widths instead of scanning all 15 rows. Free performance gain, zero visual change.

## Out of scope

- Any other fixes from brief 346 (those were correctly implemented)
- New features or architecture changes
- Bundle size optimizations

## Pre-work

- Verify branch `perf/346-fe-performance-fixes` exists and has the 346 commit
- Create `perf/347-perf-346-refinements` from it

## Criterio de cierre

- [ ] Pathfinding uses a binary min-heap with insert/extractMin/decreaseKey — no sort(), no linear scan
- [ ] `TimelineEvent` is a discriminated union — zero cast functions in component, zero `asX()` calls in template
- [ ] `.matrix-table` has `table-layout: fixed`
- [ ] FE: lint + build OK
- [ ] Existing pathfinding behavior unchanged (same routes found)

## Tiempo estimado

~45 min (heap ~25 min, discriminated union ~15 min, table-layout ~5 min).
