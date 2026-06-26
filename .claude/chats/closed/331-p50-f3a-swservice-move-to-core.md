# 331 — P50 F3a: move SwService from @features to @core

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo-50-fe-cohesion-coupling-refactor.md` Phase F3a
> **Created**: 2026-06-18 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: `false`
> **modules**: `core/services`, `features/intranet/services`
> **touches**:
>   - `educa-web`: `src/app/core/services/sw/`, `src/app/features/intranet/services/sw/`, 16 files with suppressions

## Context

P50 F1 (ESLint boundary rules) and F2 (barrel-only enforcement) are complete. F3a is the final cleanup: SwService lives in `@features/intranet/services/sw/` but is imported by 11 core files — a layer violation (core importing from features). F1 added `eslint-disable` suppressions tagged `DEBT: xrepo-50-F3a` to keep lint green. This brief removes them by fixing the root cause.

## Deliverables

### Move SwService to @core

1. Move `src/app/features/intranet/services/sw/` → `src/app/core/services/sw/`
2. Update the barrel export at `src/app/core/services/index.ts` (or create `sw/index.ts`) to re-export SwService
3. Update all 11 imports in core files to consume from `@core/services/sw/` instead of `@features/intranet/services/sw/`
4. Remove all 19 `eslint-disable` suppressions tagged `DEBT: xrepo-50-F3a` (11 in source, 8 in specs)
5. If any feature-layer code also imports SwService, update those imports to use the new @core path

### Files with suppressions (from investigation)

- `core/interceptors/sw-cache-invalidation.interceptor.ts` (+ spec)
- `core/interceptors/schema-version.interceptor.ts`
- `core/services/cache/cache-version-manager.service.ts`
- `core/services/facades/base-crud.facade.ts`
- `core/services/facades/wal-crud-ops.ts`
- `core/services/permissions/permisos.service.ts`
- `core/services/sw/index.ts`
- `core/services/wal/wal-cache-invalidator.service.ts` (+ spec)
- `core/services/wal/wal-facade-helper.service.ts` (+ spec)
- `core/services/wal/wal-reconciler.service.ts` (+ spec)
- `core/services/wal/wal-sync-engine.service.ts` (+ spec)
- `core/store/base/base-crud.store.ts`

## Criterio de cierre

- [ ] SwService lives in `@core/services/sw/`
- [ ] Zero `eslint-disable` suppressions tagged `DEBT: xrepo-50-F3a` remain
- [ ] `ng lint` passes
- [ ] `ng build` passes
- [ ] No import crosses core → features boundary for SwService

## Tiempo estimado

~30 min.
