# 332 — P50 F3b: consolidate email admin domain to @intranet-shared

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo-50-fe-cohesion-coupling-refactor.md` Phase F3b
> **Created**: 2026-06-18 · **Estado**: ✅ cerrado 2026-08-15.
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

- [x] Shared artifacts extraídos — no en `@intranet-shared/admin/email/` (rompía la convención existente por-tipo de `intranet/shared/`), sino en `admin/email-outbox-shared/`, siguiendo el precedente real ya validado en el repo: `admin/monitoreo/shared/` (carpeta plana sibling con barrel propio)
- [x] Zero direct cross-imports between the 3 email modules — verificado con grep en los 2 sentidos
- [x] Each module only imports from `email-outbox-shared`, not from each other
- [x] `ng lint` passes
- [x] `ng build` passes
- [x] Tests: 40 archivos / 224 tests en verde (módulos tocados + student-gap-profile). No se hizo QA visual en navegador — cubierto por tests, no por browser.

## Resultado real (2026-08-15)

La investigación pre-ejecución encontró **8 símbolos cruzados** (no 7 como decía el brief original): faltaban `AttendanceGapRow` y `EmailOutboxDashboardDiaService` (`diagnostico` → `dashboard-dia`).

**Alcance real más amplio que el brief**: 5 módulos fuera de los 3 originales también importaban estos símbolos directamente y hubo que actualizarlos para no romper el build — `monitoreo/`, `student-gap-profile/`, `auditoria-correos/`, `intranet/shared/components/connection-status-indicator/`.

**Acoplamiento no anticipado**: `EmailDeferFailBannerComponent` (movido a shared) depende de `EmailMonitoreoFacade`, que se queda en `email-outbox-dashboard-dia` (no es uno de los 8 símbolos, sigue siendo dashboard-dia-owned). Queda como dependencia intencional `email-outbox-shared` → `email-outbox-dashboard-dia` para ese único componente — no viola el criterio de cierre (que es sobre los 3 módulos originales, no sobre el módulo shared), pero es una decisión de diseño que vale la pena tener presente si se revisita esta área.

Los 8 archivos se movieron con `git mv` preservando historia. Barrel `email-outbox-shared/index.ts` con `export * from` por archivo.
