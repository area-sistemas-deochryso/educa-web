# 381 — FE: completar migración de roles (APP_USER_ROLES → Rol model)

> **Repos afectados**: `educa-web`
> **Created**: 2026-07-07 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/design` then `/execute`
> **exclusive**: `false`
> **modules**: `shared/constants`, `shared/utils`, `core/services/user`, `core/services/permissions`, `admin/users`, `attendance`, `admin/rate-limit-events`
> **touches**:
>   - `educa-web`: `src/app/shared/constants/app-roles.ts`, `src/app/shared/utils/role-policies.utils.ts`, `src/app/core/services/user/user-profile.service.ts`, `src/app/core/services/permissions/permisos.models.ts`, `src/app/features/intranet/pages/admin/users/**`, `src/app/features/intranet/services/attendance/**`, `src/app/features/intranet/pages/cross-role/attendance-component/**`, `src/app/features/intranet/pages/admin/rate-limit-events/**`, `src/app/data/models/mensajeria.models.ts`, `src/app/features/intranet/pages/cross-role/home-component/**`, `src/app/features/intranet/shared/services/ui-mapping/ui-mapping.service.ts`

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

## Aprendizajes transferibles (de chat 380)

- **Session-switcher ya existe** para probar con 2+ roles sin re-login: `AuthService.getSessions()`/`switchSession()` (`src/app/core/services/auth/auth.service.ts:173,181`), consumido en `login-intranet.component.ts`. Backend expone `GET /api/Auth/sessions` + `POST /api/Auth/switch-session/{deviceId}`. Buscar el selector en el dropdown del perfil de usuario (header) — evita loguear/desloguear manualmente para cada rol del criterio de cierre.
- **CRUD de `admin/users` es soft-delete**: "eliminar" marca `Inactivo`, no borra la fila. Si se crean/borran usuarios de prueba durante la verificación en browser, no asumir que desaparecen del todo — van a quedar como inactivos.
- **Feature flags en dev**: `src/app/config/environment.development.ts` → `features.*` puede tener módulos apagados en local (ej. `notifications: false` bloqueaba probar ese flujo). Si algún módulo tocado por esta migración (`attendance`, `admin/users`) no aparece en el browser, revisar ese archivo antes de asumir un bug.
- **Levantar BE+FE local**: `dotnet run --launch-profile https` en `Educa.API/Educa.API` (puerto 7102) + `npm run start` en `educa-web` (puerto 4201, proxy ya configurado en `proxy.conf.json`). La sesión de Chrome del usuario ya queda autenticada entre reinicios (cookie persiste).
- **IndexedDB**: si necesitás inspeccionar storage del navegador, listar con `indexedDB.databases()` primero — `indexedDB.open('<nombre-adivinado>')` crea silenciosamente una DB vacía si el nombre no existe. La DB real de la app es `EducaWebDB`.

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

- [x] Cero referencias a `APP_USER_ROLES`, `AppUserRole`, `AppUserRoleValue`, `RolTipo(Admin)`, `ROLES_DISPONIBLES(_ADMIN)`, `RolUsuario(Admin)`, `ROLES_USUARIOS(_ADMIN)` en el código — `app-roles.ts` borrado por completo (0 consumidores confirmados)
- [x] Los 8 `computed` de `user-profile.service.ts` migrados o borrados: 6 borrados (0 consumidores prod), `isProfesor`/`isAdministrativo` migrados a `rol()?.nombre`/comparación explícita de 4 roles
- [x] `ng build` pasa — build de producción limpio (SSR + browser bundles + prerender de 9 rutas)
- [x] Verificación manual en browser: login como Administrador (rol crítico por las 2 decisiones de negocio tomadas) — home sin widget de asistencia (correcto), panel de asistencia con selector Día/Mes vía `esStaff` (correcto), dropdown de rol en `usuario-form-dialog` poblado reactivamente desde `RolService`, dropdown de rol en `rate-limit-events` idem, tabla de usuarios con roles renderizados bien, cero errores de consola. 225 archivos de test / 2327 tests pasan (incluye tests nuevos por rol para `isAdministrativo` de los 4 roles administrativos + exclusión explícita de Administrador)

## Tiempo estimado

~2-3 h (design 30 min + execute 90-150 min, depende de si se hace en una sola sesión o por fases).

## Investigación de diseño (2026-07-07)

### Scope real: 20 archivos, no 14

El brief original subestimó el conteo. 6 archivos no listados originalmente: `mensajeria.models.ts`, `rate-limit-event.models.ts`, `rate-limit-filters.component.ts` (módulo `admin/rate-limit-events` — **fuera del `touches:` original, hay que ampliarlo**), `usuarios-ui.facade.ts`, `usuarios-validation.helpers.ts`, `attendance.component.spec.ts`. Más 2 specs con impacto indirecto: `user-profile.service.spec.ts`, `usuarios.store.spec.ts`, `home.component.spec.ts`.

### Decisiones de negocio confirmadas por el usuario

1. **`ROLES_DISPONIBLES_ADMIN` / `ROLES_USUARIOS_ADMIN`** hoy devuelven los 8 roles (no filtran por `esStaff`) pese al nombre. **Decisión: preservar paridad exacta** — no es un bug a corregir en esta migración, es distinción entre "grupo admin" (concepto propio) y "rol Administrador" (backend). Migrar a `rolService.all()` sin filtro. Fix de correctitud fuera de scope (no prioritario).
2. **`isAdministrativo`** (`user-profile.service.ts`, 4 roles: Director/AsistenteAdministrativo/Promotor/CoordinadorAcademico, excluye Administrador) vs **`isAdministrativeRole`** (`attendance.component.ts`, 5 roles = `esStaff`). **Decisión: NO es inconsistencia, es intencional** — Administrador no tiene obligación de marcar asistencia y nadie le revisa asistencia a él. Migrar `isAdministrativo` a comparación explícita de 4 roles (NO usar `esStaff`). `isAdministrativeRole` de attendance SÍ puede migrar a `esStaff` (ahí es semánticamente correcto).

### Hallazgos que reducen el trabajo

- 6 de los 8 `computed` de `user-profile.service.ts` (`isEstudiante`, `isApoderado`, `isDirector`, `isAsistenteAdministrativo`, `isPromotor`, `isCoordinadorAcademico`) **no tienen consumidores en producción** — borrado directo, no migración. Solo `isProfesor` (1 consumidor: `home.component.ts:42`) e `isAdministrativo` (1 consumidor: `home.component.ts:41`) necesitan reemplazo cuidadoso.
- `AppUserRoleAdmin`, `APP_USER_ROLE_ADMIN_LIST` — 0 consumidores, borrado trivial inmediato.
- `role-policies.utils.ts:134,136` — el lado izquierdo del OR (`base.isAdmin ||`, `base.requiresSalon ||`) es código muerto confirmado (early-return en línea 129 garantiza `endpoint` non-null). Simplificar sin cambio de comportamiento.
- Patrón objetivo ya validado en producción: `usuario-rol-constraints.models.ts` (`rolRequiereSalon`/`rolPermiteEsTutor`) ya usa `string` + `getRolPolicy()`, sin importar el símbolo deprecado.

### Orden de ejecución (por riesgo ascendente)

0. Borrado trivial (0 consumidores + dead code) → 1. Type-only (`AppUserRoleValue`→`string` en DTOs) → 2. `admin/users` (comparaciones + dropdown) → 3. `attendance` (mayor riesgo — routing + semántica `isAdministrativo`) → 4. Diccionarios cosméticos → 5. `rate-limit-events` (scope nuevo) → 6. Borrado final de `app-roles.ts` y aliases restantes → Validación (build + browser 4 roles).

Detalle completo de clasificación por archivo (línea, tipo de uso, reemplazo, riesgo) disponible en el fork de investigación de este chat — no se pega acá por extensión, pero cada fase de ejecución debe releer los archivos puntuales antes de tocar (no confiar ciegamente en el resumen).
