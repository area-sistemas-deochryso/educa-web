# 308 — FE: consume GET /api/roles and consolidate role types

> **Repos afectados**: `educa-web`
> **Plan**: N/A (continuation of BE formal-roles refactor)
> **Creado**: 2026-06-08 · **Estado**: ✅ completado.
> **Validación prod**: ⏳ pendiente desde 2026-06-09 — requiere merge de BE `feature/formal-roles` primero.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: `false`
> **modules**: `auth`, `shared`
> **touches**:
>   - `educa-web`: `src/app/core/auth/**`, `src/app/core/guards/**`, `src/app/shared/models/**`

## Context

BE branch `feature/formal-roles` (Educa.API) added:
1. `Rol` table with 7 roles, behavioral flags (`EsStaff`, `EsPasivo`, `RequiereSalon`), and single-letter codes
2. `GET /api/roles` endpoint returning the full list
3. All BE role references now use `Roles.*` / `TipoPersona.*` constants
4. Auth inserts populate `RolID` FK

The JWT still carries full role names ("Director", "Profesor", etc.) — `[Authorize(Roles = "...")]` is unchanged.

## Scope

### educa-web

1. **RolService**: create a service that calls `GET /api/roles`, caches the result (roles are static at runtime)
2. **Consolidate duplicate types**: the FE has ~5 scattered role type/interface definitions — unify into a single model matching the endpoint DTO
3. **Guards**: current guards compare hardcoded role strings — migrate to use centralized constants or the cached service
4. **Cleanup**: remove the duplicate definitions once migrated

## Pre-work

- `//directo` if the chat is purely mechanical
- Read the audit at `educa-coord/audits/fe-academico-module-audit.md` if it has relevant role-related findings
- Grep for all role string literals and type definitions before starting

## Out of scope

- BE changes (already done on `feature/formal-roles`)
- Making `RolID` NOT NULL on auth tables (requires deployment + backfill first)
- Mobile app role handling

## Criterio de cierre

- [x] Single `Rol` interface/type used across the app — `@data/models/rol.models.ts`
- [x] `RolService` consuming `GET /api/roles` with caching — `@core/services/roles/`
- [x] Guards using centralized role constants (no hardcoded strings) — guards were already clean; `UserProfileService.rol` now exposes full `Rol` object
- [x] Duplicate role definitions marked `@deprecated 2026-06-08` with removal date 2026-07-08
- [x] `ng build --configuration=production` + lint pass
- [x] Branch: `feature/formal-roles` (shared with BE)

## Tiempo estimado

~45 min.
