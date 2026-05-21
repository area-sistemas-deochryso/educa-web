# 216 — Plan 50 F1: ESLint core boundary rules

- **Plan**: [`educa-coord/plans/xrepo-50-fe-cohesion-coupling-refactor.md`](../../../../educa-coord/plans/xrepo-50-fe-cohesion-coupling-refactor.md) §F1
- **Audit**: [`educa-coord/audits/213-fe-cohesion-coupling.md`](../../../../educa-coord/audits/213-fe-cohesion-coupling.md) §D1
- **Branch**: `refactor/50-f1-eslint-core-boundaries`
- **Modo**: `/execute`
- **Estado**: ✅ completado 2026-05-21

## Scope

2 new entries in `LAYER_RULES` (`eslint.config.js`):
1. `core-no-features` — `@core` cannot import from `@features/` or `@intranet-shared`
2. `core-no-shared` — `@core` cannot import from `@shared/`

18 existing violations suppressed with `// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-50-F3a`.

## Violations suppressed

**core→features (11 — all SwService)**:
- `core/services/cache/cache-version-manager.service.ts`
- `core/services/sw/index.ts`
- `core/services/facades/base-crud.facade.ts`
- `core/services/wal/wal-facade-helper.service.ts` + `.spec.ts`
- `core/services/wal/wal-cache-invalidator.service.ts`
- `core/services/wal/wal-reconciler.service.ts` + `.spec.ts`
- `core/services/wal/wal-sync-engine.service.ts` + `.spec.ts`
- `core/interceptors/sw-cache-invalidation/sw-cache-invalidation.interceptor.ts`

**core→shared (7)**:
- `core/store/base/base-crud.store.ts` — `HasId` from `@shared/interfaces`
- `core/services/facades/base-crud.facade.ts` — `HasId` + `UI_ADMIN_ERROR_DETAILS`/`UI_SUMMARIES`
- `core/services/attendance/index.ts` — re-export from `@shared/services/attendance`
- `core/services/permissions/permisos.service.ts` — `ApiResponse` + `PaginatedResponse`
- `core/interceptors/schema-version/schema-version.interceptor.ts` — `extractPathname`/`getSchemaVersion`

## Resultado

- 16 archivos tocados, +50 líneas
- Lint: 0 errores nuevos (3 pre-existentes en error-groups, fuera de scope)
- F3a será quien mueva los archivos y remueva las suppressions
