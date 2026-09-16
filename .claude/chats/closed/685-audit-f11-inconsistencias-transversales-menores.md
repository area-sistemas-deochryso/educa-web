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

- [x] Los 4 puntos resueltos.
- [x] Build + lint + tests OK (lint 0 warnings; tests 2592/2593, 1 timeout flaky confirmado no relacionado en aislamiento).
- [x] Plan actualizado: F11 → ✅.
- [x] Maestro actualizado.

## Tiempo estimado

~1h30.

## Resultado (2026-09-16)

**Worktree**: `chat/685-audit-f11-inconsistencias-transversales-menores` — `EducaWeb/WT/educa-web/685-audit-f11-inconsistencias-transversales-menores`

1. **Alias `@env`/`@config`**: solo `@env/environment` estaba en uso (32 archivos, no ~6 como estimaba el brief). Consolidado a `@config/environment` en los 32 + alias `@env`/`@env/*` eliminado de `tsconfig.json` (0 referencias restantes, sin necesidad de shim de compat).
2. **`CommonModule` sin uso**: scope real 172 archivos (no ~10). Clasificados por script: 113 sin ningún pipe/directiva estructural real → import removido entero; 41 con pipe puntual usado en template → reemplazado por `DatePipe`/`DecimalPipe`/`SlicePipe`/`LowerCasePipe` (import + entrada en `imports:`); 18 con `ngClass`/`ngStyle` real → `CommonModule` se dejó intacto (uso legítimo, no era el caso del hallazgo).
3. **Naming `edu-ui`**: `EduMessageSeverity`/`EduToastSeverity` unificados a `'danger'` (decisión del usuario — ya mayoritario en `EduButtonSeverity`/`EduBadgeSeverity`/`EduTagSeverity`). Tocó `edu-message.ts`, `edu-message.service.ts`, `edu-toast.ts`, `edu-toast.scss`, 2 templates (`ayuda-salud-sede`, `feedback-report-dialog`), 4 call-sites directos de `EduMessageService.add()` (`attendances.component.ts`, `ayuda-ticket.component.ts`, `user-info-dialog.component.ts`, `floating-notification-bell.component.ts` — este último lo encontró el build, no el grep manual). El dominio `ErrorSeverity` (`error-handler.service.ts`) se dejó como `'error'` a propósito — no es un tipo de `edu-ui`, y se agregó un mapeo explícito `ERROR_SEVERITY_TO_TOAST_SEVERITY` en el único punto de boundary (`toast-container.component.ts`). `EduButtonSize`/`EduAvatarSize` (única pareja de tipos `*Size` en todo `edu-ui`) se documentaron con un comentario de una línea cada uno explicando por qué difieren, en vez de unificar una escala compartida sin necesidad real (decisión del usuario).
4. **`DestroyRef` sin efecto real**: `core/services/destroy/destroy.service.ts` y `destroyable.component.ts` eran dead code 100% confirmado (0 usos en todo el codebase) → eliminados, `index.ts` del barrel actualizado (`TimerManager` se mantiene, sí está en uso). `rate-limit-events.facade.ts` se dejó sin cambios — decisión del usuario: es el mismo patrón usado en 10+ facades `providedIn: 'root'` del proyecto y `code-style.md` regla 2 exige `takeUntilDestroyed` siempre; cambiar solo este archivo habría creado inconsistencia sin arreglar el patrón real (que está fuera de scope de este brief).

**Incidente de tooling durante la ejecución**: el script Node usado para automatizar el punto 2 (154 archivos) escribió con line-endings LF, pero varios archivos del repo están commiteados en CRLF (mezcla real por archivo, no convención uniforme — confirmado contra `git show HEAD:<path>`). Esto infló el diff a "archivo entero reescrito" en 4 archivos. Detectado y corregido antes de cerrar: se comparó cada archivo tocado contra su blob de `HEAD` y se restauró CRLF donde correspondía. Diff final: 198 archivos, +236/-477 líneas (neto negativo por las 2 deleciones de dead code).
