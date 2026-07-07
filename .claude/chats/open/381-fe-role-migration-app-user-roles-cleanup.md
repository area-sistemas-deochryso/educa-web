# 381 — FE: completar migración de roles (APP_USER_ROLES → Rol model)

> **Repos afectados**: `educa-web`
> **Created**: 2026-07-07 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/design` then `/execute`
> **exclusive**: `false`
> **modules**: `shared/constants`, `shared/utils`, `core/services/user`, `core/services/permissions`, `admin/users`, `attendance`
> **touches**:
>   - `educa-web`: `src/app/shared/constants/app-roles.ts`, `src/app/shared/utils/role-policies.utils.ts`, `src/app/core/services/user/user-profile.service.ts`, `src/app/core/services/permissions/permisos.models.ts`, `src/app/features/intranet/pages/admin/users/**`, `src/app/features/intranet/services/attendance/**`, `src/app/features/intranet/pages/cross-role/attendance-component/**`

## Contexto

Migración de roles iniciada el 2026-06-08 (fecha de deprecación con vencimiento anotado 2026-07-08, es decir mañana respecto a esta auditoría). El objetivo original: reemplazar comparaciones por string hardcodeado (`APP_USER_ROLES.Estudiante`, etc.) por el modelo `Rol` (`Rol.nombre`, `Rol.esStaff`, `Rol.requiereSalon`) que viene de `GET /api/roles` y es 1:1 con el backend.

Auditoría de código `@deprecated` (2026-07-07) confirmó que la fecha límite **no se cumplió**: el bloque completo sigue con uso real y extendido.

## Estado verificado por archivo

| Símbolo deprecado | Reemplazo | Consumidores confirmados |
|---|---|---|
| `APP_USER_ROLES`, `AppUserRole`, `AppUserRoleValue` (`app-roles.ts`) | `RolService.byNombre()` / `Rol` model | 14 archivos, incluye lógica de negocio real (no solo tipos) — `usuarios.component.ts`, `attendance-view.service.ts`, `role-policies.utils.ts`, `ui-mapping.service.ts`, `attendance.component.ts`, etc. |
| `RolTipo`, `ROLES_DISPONIBLES`, `ROLES_DISPONIBLES_ADMIN`, `RolTipoAdmin` (`permisos.models.ts`) | `Rol` / `RolService.all()` | usado en `admin/users` |
| `RolUsuario`, `RolUsuarioAdmin`, `ROLES_USUARIOS`, `ROLES_USUARIOS_ADMIN` (`usuarios.models.ts`) | ídem | `usuarios-data.facade.ts`, `usuario-form-dialog.component.ts`, `usuarios.store.ts` — filtros, mapeo de formulario, selects |
| 8 `computed` de `user-profile.service.ts` (`isEstudiante`, `isApoderado`, `isProfesor`, `isDirector`, `isAsistenteAdministrativo`, `isPromotor`, `isCoordinadorAcademico`, `isAdministrativo`) | `rol()?.nombre` / flags de comportamiento (`esStaff`, etc.) | no auditados uno por uno en detalle — comparten la raíz `APP_USER_ROLES`, revisar consumidores de cada `computed` en fase de diseño |
| `RolNombre` (`rol.models.ts`) | — | ✅ **ya borrado** en la sesión del 2026-07-07 (cero consumidores) |

`role-policies.utils.ts:134,136` tiene un patrón distinto: usa fallback (`base.isAdmin || endpoint.esStaff`) para transicionar gradualmente — revisar si ya se puede sacar el lado izquierdo del OR.

## Por qué quedó pendiente (no es limpieza trivial)

Es una migración viva de arquitectura, no código muerto: 14+ archivos con lógica real (comparaciones de string en formularios, filtros, mapeo de UI). Requiere:
1. Confirmar por cada `computed`/constante qué comportamiento exacto reemplaza (algunos son 1:1 con `Rol.nombre`, otros con flags booleanos como `esStaff`/`requiereSalon`).
2. Decidir el orden de migración (¿por módulo — admin/users primero, luego attendance? ¿o por símbolo — todos los `APP_USER_ROLES.Estudiante` primero?).
3. Verificar en browser que selects, filtros y comparaciones de rol siguen funcionando igual tras cada cambio — alto riesgo de romper permisos/visibilidad si se apura.

## Deliverables

### Fase de diseño
1. Mapear los 14+ archivos consumidores de `APP_USER_ROLES` y clasificar cada uso: comparación directa (`=== APP_USER_ROLES.X`) vs. flag booleano (`isAdmin`, `esStaff`) vs. iteración (`ROLES_DISPONIBLES.map(...)`).
2. Decidir estrategia de migración: todo de una vez vs. por fases/módulo.
3. Confirmar plan de verificación (qué probar en browser por rol: Estudiante, Profesor, Director, Administrador, etc.).

### Fase de ejecución
1. Migrar módulo por módulo (sugerido: `admin/users` → `attendance` → resto), reemplazando comparaciones por `Rol`/`RolService`.
2. Borrar cada símbolo deprecado cuando su último consumidor migre.
3. Verificar en browser con al menos 2 roles distintos que permisos/UI no cambiaron.

## Criterio de cierre

- [ ] Cero referencias a `APP_USER_ROLES`, `AppUserRole`, `AppUserRoleValue`, `RolTipo(Admin)`, `ROLES_DISPONIBLES(_ADMIN)`, `RolUsuario(Admin)`, `ROLES_USUARIOS(_ADMIN)` en el código (fuera de sus propias declaraciones, si aún no se borraron)
- [ ] Los 8 `computed` de `user-profile.service.ts` migrados o borrados si quedan sin consumidor
- [ ] `ng build` pasa
- [ ] Verificación manual en browser: login con 2+ roles distintos, confirmar permisos/vistas sin regresión

## Tiempo estimado

~2-3 h (design 30 min + execute 90-150 min, depende de si se hace en una sola sesión o por fases).
