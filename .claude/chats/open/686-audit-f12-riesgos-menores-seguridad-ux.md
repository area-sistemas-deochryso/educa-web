# 686 — Audit F12: Riesgos menores de seguridad/UX

> **Repo destino**: `educa-web` (punto 3 puede requerir contraparte BE — confirmar en pre-work).
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F12)
> **Creado**: 2026-09-12 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute` (punto 3: `/investigate` corto primero)
> **touches**:
>   - `src/app/features/intranet/pages/login/login-intranet.component.ts`, `src/app/core/services/auth/auth.service.ts`
>   - `src/app/features/intranet/pages/admin/campus/models/campus-admin.model.ts`, `services/campus-admin.facade.ts`
>   - `src/app/features/intranet/pages/cross-role/videoconferencias/*`

## Origen

Hallazgos de `/audit` (2026-09-12), categoría "Riesgo" — 3 hallazgos de menor severidad que la seguridad crítica de F2 (password plaintext), agrupados por ser todos riesgos acotados de UX/seguridad.

## Scope

1. **Login — rate limiting solo en memoria del cliente**: `AuthService._loginAttempts` (`auth.service.ts:37`) es un signal en memoria que se resetea con cualquier recarga (`login-intranet.component.ts:105` llama `resetAttempts()` en `ngOnInit`). Un usuario bloqueado por intentos fallidos puede evadir el bloqueo del lado cliente con F5. El mensaje de bloqueo da una falsa sensación de protección si el backend no limita también. Fix: documentar explícitamente que el gate es solo UX (si el backend ya limita), o persistir el contador en `sessionStorage` con expiración corta si se quiere que sobreviva a un refresh.
2. **`campus-admin.model.ts:87-151` / `campus-admin.facade.ts:164-297`** — mutaciones del piso sin `rowVersion`/manejo de 409, a diferencia de `ayuda-tickets` (que sí implementa `rowVersion`+409 en el mismo repo). Dos admins editando el mismo piso concurrentemente producen "last write wins" silencioso en un editor drag-and-drop. Fix: replicar el patrón `rowVersion`+409 ya usado en `ayuda-tickets`.
3. **Videollamadas — sin manejo de expiración de token JaaS**: `VideoconferenciaSalaComponent`/`VideoconferenciasFacade` no manejan renovación de JWT. El backend (`JaaSTokenService`) fija `exp` en 24h — una clase que exceda esa duración perdería la sesión sin aviso ni reintento de refresh. Fix: agregar manejo de expiración/renovación en el cliente, coordinado con el backend si requiere un endpoint de refresh (confirmar con `/investigate` si ya existe).

## Pre-work

- Punto 1: confirmar con `/investigate` si el backend ya limita intentos de login (si es así, el fix es solo documentar la intención del gate cliente; si no, evaluar si vale la pena persistir el contador o si el fix real debe ser del lado BE).
- Punto 3: confirmar si `Educa.API` ya expone algún mecanismo de refresh de token JaaS antes de diseñar el manejo del lado cliente — si no existe, este brief puede requerir handoff a `Educa.API` (mismo patrón que el brief 667 del audit anterior).

## Out of scope

- El resto de hallazgos del audit (ver plan).
- Punto 2: no es una refactorización general de manejo de concurrencia — solo replicar el patrón ya validado en `ayuda-tickets`.

## Criterio de cierre

- [ ] Punto 1: gate documentado o persistencia agregada, según lo que confirme la investigación.
- [ ] Punto 2: `rowVersion`+409 implementado en `campus-admin`, verificado con 2 sesiones editando el mismo piso simultáneamente.
- [ ] Punto 3: manejo de expiración agregado, o brief de handoff a `Educa.API` creado si requiere endpoint nuevo.
- [ ] Build + lint + tests OK.
- [ ] Plan actualizado: F12 → ✅ (cierra el plan completo de 12 fases).
- [ ] Maestro actualizado.

## Tiempo estimado

~2h30 (incluye investigación de puntos 1 y 3).
