# 216 — xrepo-50 F1: ESLint rule — core cannot import features or shared

> **Repos afectados**: `educa-web`
> **Plan**: `../educa-coord/plans/xrepo-50-fe-cohesion-coupling-refactor.md` (F1)
> **Creado**: 2026-05-21 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: `false`
> **touches**:
>   - `educa-web`: ESLint plugin config (`layer-enforcement`), suppression comments in 18 files

## Plan context

This brief is part of **xrepo-50 — FE cohesion & coupling refactor** (4 phases, ~7 briefs).
Full plan: `../educa-coord/plans/xrepo-50-fe-cohesion-coupling-refactor.md`.
Audit findings: `../educa-coord/audits/213-fe-cohesion-coupling.md`.

### Branch strategy

- **Main refactor branch**: `refactor/50-fe-cohesion` (create from `main` at start of F1).
- **This brief's branch**: `refactor/50-f1-eslint-core-boundaries` (branch from `refactor/50-fe-cohesion`).
- After F1 completes, merge into `refactor/50-fe-cohesion`.
- Future phases (F2-F4) branch from `refactor/50-fe-cohesion` and merge back.

### Worktree setup

Run from the educa-web repo root:
```powershell
git branch refactor/50-fe-cohesion              # create main refactor branch
git worktree add ../educa-web-f1 refactor/50-fe-cohesion  # worktree for this brief
cd ../educa-web-f1
git checkout -b refactor/50-f1-eslint-core-boundaries     # sub-branch for this work
```

### Phase overview

| Phase | Targets | Status |
|---|---|---|
| **F1** | **ESLint: core cannot import features/shared (this brief)** | **← you are here** |
| F2 | Barrel-only enforcement (core/services + data/models) | ⏳ blocked by F1 |
| F3 | File moves + email restructure (parallelizable) | ⏳ blocked by F2 |
| F4 | Unify role-based views | ⏳ blocked by F3 |

## Scope

### Add 2 rules to `layer-enforcement` plugin

Locate the `LAYER_RULES` configuration in the custom ESLint plugin (`layer-enforcement/imports-error`) and add:

1. **`@core` cannot import from `@features` or `@intranet-shared`**
   - Pattern: files under `src/app/core/` must not contain imports from `@features/` or `@intranet-shared/`
   - This catches the SwService violation (11 files) and any future core→features dependency

2. **`@core` cannot import from `@shared`**
   - Pattern: files under `src/app/core/` must not contain imports from `@shared/`
   - This catches the 7 existing core→shared violations (HasId, ApiResponse, constants, attendance shim)

### Suppress existing violations

After adding the rules, the 18 existing violations must be suppressed so lint passes:

**core→features (11 files)** — all SwService imports:
- `core/interceptors/sw-cache-invalidation/sw-cache-invalidation.interceptor.ts`
- `core/services/cache/cache-version-manager.service.ts`
- `core/services/sw/index.ts`
- `core/services/wal/wal-cache-invalidator.service.ts`
- `core/services/wal/wal-facade-helper.service.ts`
- `core/services/wal/wal-reconciler.service.ts`
- `core/services/wal/wal-sync-engine.service.ts`
- `core/services/facades/base-crud.facade.ts`
- + 3 spec files

**core→shared (7 files)**:
- `core/store/base/base-crud.store.ts` — HasId from @shared/interfaces
- `core/interceptors/schema-version/schema-version.interceptor.ts` — utils from @shared/constants
- `core/services/attendance/index.ts` — re-export from @shared
- `core/services/facades/base-crud.facade.ts` — HasId + UI constants from @shared
- `core/services/permissions/permisos.service.ts` — ApiResponse, PaginatedResponse from @shared/models

Each suppression: `// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-50-F3a`

## Pre-work

- Read the existing `layer-enforcement` plugin source to understand how rules are defined and where `LAYER_RULES` lives.
- Run `npx eslint --print-config src/app/core/services/sw/index.ts` to verify current rule state.

## Out of scope

- Moving any files (that's F3).
- Barrel enforcement (that's F2).
- Fixing the 18 violations (that's F3a — this brief only suppresses them).

## Criterio de cierre

- [ ] 2 new ESLint rules added to layer-enforcement plugin.
- [ ] All 18 existing violations suppressed with DEBT comment.
- [ ] `ng lint` passes.
- [ ] No new core→features or core→shared import can be added without lint error.
- [ ] No code logic modified — only ESLint config and suppression comments.

## Tiempo estimado

~60 min.
