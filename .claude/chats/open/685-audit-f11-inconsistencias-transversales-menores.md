# 685 — Audit F11: Inconsistencias transversales menores

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F11)
> **Creado**: 2026-09-12 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **touches**: transversal — imports de `environment`, `CommonModule`, `edu-ui` severity/size types, `core/services/destroy/`, `rate-limit-events.facade.ts`

## Origen

Hallazgos de `/audit` (2026-09-12), categoría "Inconsistencia" — 4 hallazgos de bajo riesgo funcional pero alto ruido de mantenimiento, agrupados en un solo brief de limpieza.

## Scope

1. **Alias duplicado de `environment`**: `@config/environment` (mayoría del código) vs `@env/environment` (~6 archivos: `auth-api.service.ts`, `permisos.service.ts`, `base-http.service.ts`, `justificacion-asistencia-bandeja-api.service.ts`, entre otros). Resuelven al mismo path pero dificultan grep/mantenimiento. Fix: consolidar en un solo alias (sugerido `@config`, ya mayoritario) y actualizar `tsconfig.json` si corresponde deprecar el otro.
2. **`CommonModule` importado sin uso**: al menos ~10 archivos (`dependency-guidance.component.ts`, `rate-limit-countdown-toast.component.ts`, `toast-container.component.ts`, `auditoria-correos.component.ts`, `faq-admin-form-dialog.component.ts`, `explicaciones-admin-form-dialog.component.ts`, `usuario-inline-detail.component.ts`, `usuario-form-dialog.component.ts`, `vistas.component.ts`, `schedule.component.ts`, `ayuda-ticket.component.ts`, `notificaciones-admin.component.ts`, entre otros) — control flow ya es 100% moderno, no necesitan el módulo completo. Fix: eliminar el import o cambiar por el pipe puntual que sí se usa (`DatePipe`, `LowerCasePipe`, etc.).
3. **Naming inconsistente en `edu-ui`**: `EduButtonSeverity`/`EduBadgeSeverity`/`EduTagSeverity` usan `'danger'` mientras `EduMessageSeverity`/`EduToastSeverity` usan `'error'` en el mismo lugar semántico; `EduButtonSize` (`xs|small|large`) vs `EduAvatarSize` (`normal|large|xlarge`) sin escala compartida. Fix: unificar en un solo término/escala o documentar explícitamente por qué message/toast y avatar difieren.
4. **`DestroyRef` de servicios `root` sin efecto real**: patrón encontrado tanto en `core/services/destroy/destroy.service.ts` (legacy, Subject+`takeUntil` con herencia obligada, coexistiendo sin criterio con `inject(DestroyRef)` ya usado en otros servicios) como en `rate-limit-events.facade.ts` (el `DestroyRef` inyectado es del injector raíz — `takeUntilDestroyed()` ahí es cosmético, no limpia nada real al navegar). Fix: deprecar el patrón legacy en favor de `untilDestroyed()`/`DestroyRef` real de componente; en `rate-limit-events.facade.ts` reemplazar por un `teardown()` explícito si se necesita limpieza real ligada a componente.

## Pre-work

- Los 4 puntos son de bajo riesgo funcional — pueden resolverse en cualquier orden, buen candidato para hacer en una sola pasada de "housekeeping".
- Punto 3 requiere una decisión de naming (no solo un rename mecánico) — confirmar con el usuario el término final antes de aplicar el `replace_all`.

## Out of scope

- El resto de hallazgos del audit (ver plan).
- No es un refactor de todo `edu-ui` — solo el naming de `severity`/`size` señalado.

## Criterio de cierre

- [ ] Los 4 puntos resueltos.
- [ ] Build + lint + tests OK (lint debería bajar de warnings tras remover imports muertos).
- [ ] Plan actualizado: F11 → ✅.
- [ ] Maestro actualizado.

## Tiempo estimado

~1h30.
