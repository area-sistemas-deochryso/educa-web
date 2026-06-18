# 332 — P50 F3b: consolidate email admin domain to @intranet-shared

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo-50-fe-cohesion-coupling-refactor.md` Phase F3b
> **Created**: 2026-06-18 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/design` then `/execute`
> **exclusive**: `false`
> **modules**: `admin/email-outbox`, `admin/email-outbox-dashboard-dia`, `admin/email-outbox-diagnostico`, `intranet-shared`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/email-outbox*/`, `src/app/features/intranet-shared/`

## Context

The email admin domain is split across 3 modules that cross-import each other (7 active dependencies). This creates a tightly coupled cluster where changes in one module ripple to others. The goal is to extract shared artifacts to `@intranet-shared/admin/email/` so each module has a clean public API.

## Current state (from 2026-06-18 investigation)

### Modules
- `admin/email-outbox/` — 4 components, 3 services + 2 facades, 1 model file
- `admin/email-outbox-dashboard-dia/` — 3 components, 2 services + 1 facade + 1 store, 1 model file
- `admin/email-outbox-diagnostico/` — 1 main component

### Cross-imports (7)
- `email-outbox` → `dashboard-dia`: EmailHubService, EmailDeferFailBannerComponent, email-monitoreo.models
- `dashboard-dia` → `email-outbox`: TipoFalloLabelPipe, DeferFailStatus model, EmailOutboxApiService
- `diagnostico` → `dashboard-dia`: EmailDeferFailBannerComponent

## Deliverables

### Design phase
1. Decide which artifacts belong in `@intranet-shared/admin/email/`:
   - Shared models (DeferFailStatus, email-monitoreo.models, etc.)
   - Shared components (EmailDeferFailBannerComponent, TipoFalloLabelPipe)
   - Shared services (EmailHubService, EmailOutboxApiService — evaluate if truly shared or if one module owns)
2. Define the barrel export structure for the new shared module

### Execute phase
1. Create `src/app/features/intranet-shared/admin/email/` with barrel
2. Move shared artifacts there
3. Update imports in all 3 email modules to consume from `@intranet-shared/admin/email/`
4. Verify zero cross-imports between the 3 modules remain

## Criterio de cierre

- [ ] `@intranet-shared/admin/email/` exists with shared artifacts
- [ ] Zero direct cross-imports between the 3 email modules
- [ ] Each module only imports from @intranet-shared, not from each other
- [ ] `ng lint` passes
- [ ] `ng build` passes
- [ ] Email admin pages function correctly (outbox list, dashboard día, diagnóstico)

## Tiempo estimado

~90 min (design 20 min + execute 70 min).
