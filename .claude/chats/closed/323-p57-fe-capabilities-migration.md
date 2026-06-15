# 323 — P57 FE: Migrate permissions to capabilities (URGENT — prod broken)

> **Repos afectados**: `educa-web`
> **Plan**: P57 — Capability-based auth
> **Creado**: 2026-06-15 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute` (root cause confirmed, no design needed)
> **exclusive**: `true` — auth system, affects all routes
> **modules**: `core/permissions`, `admin/permissions-*`, `admin/vistas`
> **touches**:
>   - `educa-web`: `src/app/core/services/permissions/**`, `src/app/core/guards/permissions/**`, `src/app/shared/constants/permission-registry.ts`, `src/app/features/intranet/pages/admin/permissions-*/**`, `src/app/features/intranet/pages/admin/vistas/**`

## Problem (PRODUCTION)

P57 BE deleted all legacy permissions controllers (`MisPermisosController`, `PermisosRolController`, `PermisosUsuarioController`, `VistasController`) and replaced them with capability-based auth. The FE was never updated — it still calls `GET /api/sistema/permisos/mis-permisos` which returns 404. The `catchError` in `getMisPermisos()` silently returns `null`, so login doesn't crash but permissions are broken.

## BE endpoints available (already deployed)

### Auth (current user)
- `GET /api/auth/capabilities` → returns `ApiResponse<string[]>` with effective capability codes (role defaults + user overrides). This replaces `GET /api/sistema/permisos/mis-permisos`.

### Admin CRUD
- `GET/POST/PATCH/DELETE /api/admin/capabilities/catalog` — capability CRUD (replaces Vistas)
- `GET/PUT /api/admin/capabilities/roles` — role↔capability matrix (replaces PermisosRol)
  - `PUT /api/admin/capabilities/roles/{rolId}/capabilities` — set capabilities for a role
- `GET/PUT /api/admin/capabilities/users` — user capability overrides (replaces PermisosUsuario)
  - `PUT /api/admin/capabilities/users/{entityId}/{rolId}` — set user overrides

## Key insight: capability codes = route paths

The BE seeded capabilities with codes that **match the existing `PERMISOS` registry keys exactly**:
- `INTRANET`, `ASISTENCIA`, `ADMIN_PERMISOS_ROLES`, `ADMIN_USUARIOS`, `ESTUDIANTE_HORARIOS`, `PROFESOR_CURSOS`, etc.

The `permission-registry.ts` maps these keys to route paths (e.g., `ADMIN_HORARIOS` → `'intranet/admin/horarios'`). The guard currently does exact match on the route path against `vistasPermitidas[]` (which are route strings). The new system returns capability CODES, so the guard needs to:
1. Call `GET /api/auth/capabilities` → get `['ADMIN_HORARIOS', 'ADMIN_SALONES', ...]`
2. Convert route path → capability code via reverse lookup on `PERMISOS` registry
3. Check if the code is in the user's capabilities

## Migration plan (3 layers, single chat)

### Layer 1: Core auth flow (CRITICAL — fixes prod)

**Files to change:**

1. **`permisos.service.ts`** — Add method `getMyCapabilities()` calling `GET /api/auth/capabilities`. Keep legacy methods temporarily for admin pages (Layer 3).

2. **`permisos.models.ts`** — Add `CapabilityResponse` interface (just `string[]` from `ApiResponse`). Keep legacy models for now.

3. **`user-permisos.service.ts`** — This is the critical fix:
   - Change `loadPermisos()` and `ensurePermisosLoaded()` to call `getMyCapabilities()` instead of `getMisPermisos()`
   - Store capability codes (not route paths) in `_permisos` signal — change type from `PermisosUsuarioResultado` to `string[]`
   - Update `tienePermiso(ruta)` to: receive route path → reverse-lookup capability code from `PERMISOS` → check if code is in capabilities array
   - Remove `permisosToken` / JWT expiry refresh — capabilities don't use JWT tokens, use a simpler TTL cache instead
   - Update `saveToStorage()` / `loadFromStorage()` to handle new format
   - Update `vistasPermitidas` computed → rename to `capabilities` computed

4. **`permisos.guard.ts`** — Minimal change: `tienePermiso(fullPath)` already abstracts the check. If `user-permisos.service.ts` handles the route→code mapping internally, the guard doesn't change.

5. **`permission-registry.ts`** — Add reverse map:
   ```typescript
   export const ROUTE_TO_CAPABILITY: Record<string, string> = Object.fromEntries(
     Object.entries(PERMISOS).map(([key, route]) => [route, key])
   );
   ```

**Consumers to update (import changes only):**
- `login-intranet.component.ts` — calls `userPermissionsService.clear()` (no change needed, method stays)
- `session-activity.service.ts` — calls `userPermissionsService.clear()` (same)
- `intranet-layout.component.ts` — check if it reads `vistasPermitidas` (rename to `capabilities`)
- `home.component.ts` — check usage
- `monitoreo-hub.component.ts` — check usage

### Layer 2: Storage cleanup

- `storage.service.ts` / `storage.models.ts` — update the permisos storage key to store `string[]` instead of `PermisosUsuarioResultado`. Bump schema version to invalidate old cached permisos on existing sessions.
- `cache-versions.config.ts` — bump if needed
- `sw-cache-invalidation.interceptor.ts` — verify no permisos-specific cache rules break

### Layer 3: Admin pages (can be deferred to separate brief if time-critical)

The 3 admin pages (`permissions-roles/`, `permissions-users/`, `vistas/`) call legacy CRUD endpoints that no longer exist. Options:

**Option A (recommended for now):** Rewire to new endpoints:
- `vistas/` → rewire to `GET/POST/PATCH/DELETE /api/admin/capabilities/catalog`
- `permissions-roles/` → rewire to `GET/PUT /api/admin/capabilities/roles`
- `permissions-users/` → rewire to `GET/PUT /api/admin/capabilities/users`

**Option B (if time-critical):** Hide the 3 admin pages from the menu temporarily (they show 404/empty anyway). Fix in a follow-up brief. This is viable because the admin rarely uses these pages and the BE migration already seeded the correct data.

## Execution order

1. Layer 1 first — fixes the production auth break
2. Layer 2 — ensures no stale cache issues
3. Layer 3 — Option A or B based on time

## Validation

- [ ] Login → `GET /api/auth/capabilities` called (not `/api/sistema/permisos/mis-permisos`)
- [ ] Guard works: admin user can access admin pages, student cannot
- [ ] `permissionPath` override still works for dynamic routes (e.g., `correlation/:id`)
- [ ] Storage: old cached permisos are invalidated on first load (schema version bump)
- [ ] Logout clears capabilities from storage
- [ ] Periodic refresh works with new endpoint
- [ ] Admin pages: either rewired (Option A) or hidden (Option B)
- [ ] FE: lint + build OK

## Reference

### Capability codes in DB (foundation seed — W0)

```
INTRANET, ASISTENCIA,
ADMIN_PERMISOS_ROLES, ADMIN_PERMISOS_USUARIOS, ADMIN_USUARIOS,
ESTUDIANTE_HORARIOS, ESTUDIANTE_CURSOS, ESTUDIANTE_NOTAS, ESTUDIANTE_ASISTENCIA,
ESTUDIANTE_FORO, ESTUDIANTE_MENSAJERIA, ESTUDIANTE_SALONES,
PROFESOR_HORARIOS, PROFESOR_CURSOS, PROFESOR_CALIFICACIONES, PROFESOR_ASISTENCIA,
PROFESOR_FORO, PROFESOR_MENSAJERIA, PROFESOR_SALONES, PROFESOR_FINAL_SALONES,
CALENDARIO, VIDEOCONFERENCIAS
```

Additional caps from W1-W4 seeds (controller-level): `HORARIOS_VIEW`, `SALONES_VIEW`, `CURSOS_VIEW`, `CAMPUS_VIEW`, `ASISTENCIA_ADMIN`, `PERMISOS_SALUD`, `USUARIOS_VIEW`, `ADMIN_MONITOREO`, `EMAIL_OUTBOX_*`, `ERROR_LOGS`, `REPORTES_USUARIO`, `RATE_LIMIT_EVENTS`, `RUNTIME_HEALTH`, `CORRELACION_*`, `ASISTENCIA_CONSULTA_*`, `NOTIFICACIONES_*`, `EVENTOS_CALENDARIO_*`, `VIDEOCONFERENCIA_*`, `CTEST_K6`.

### Key files in BE for reference
- `AuthController.cs:237` — `GET /api/auth/capabilities`
- `CapabilityService.cs` — resolves effective caps (role defaults + user grants - user denies)
- `CapabilityCatalogController.cs` — admin CRUD for capabilities
- `RolCapabilityController.cs` — role↔capability matrix
- `UsuarioCapabilityController.cs` — user overrides

## Tiempo estimado

~90 min Layer 1+2 (critical fix), ~60 min Layer 3 (admin pages).
