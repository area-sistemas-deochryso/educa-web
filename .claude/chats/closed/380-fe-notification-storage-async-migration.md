# 380 — FE: migrar storage de notificaciones sync a Async

> **Repos afectados**: `educa-web`
> **Created**: 2026-07-07 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/design` then `/execute`
> **exclusive**: `false`
> **modules**: `core/services/storage`, `core/services/notifications`
> **touches**:
>   - `educa-web`: `src/app/core/services/storage/storage.service.ts`, `src/app/core/services/notifications/notifications-persistence.helper.ts`, `src/app/core/services/notifications/notifications.service.ts`

## Contexto

Auditoría de código `@deprecated` (2026-07-07) encontró 4 métodos síncronos en `StorageService` marcados deprecados a favor de sus contrapartes `Async` (que usan IndexedDB vía `NotificationStorageService`, con fallback a localStorage):

- `getDismissedNotifications()` → `getDismissedNotificationsAsync()`
- `setDismissedNotifications()` → `setDismissedNotificationsAsync()`
- `getReadNotifications()` → `getReadNotificationsAsync()`
- `setReadNotifications()` → `setReadNotificationsAsync()`

A diferencia de otros casos `@deprecated` limpiados en esa misma sesión (que eran código muerto), **estos 4 tienen consumidor real y activo**: `notifications-persistence.helper.ts` (`loadDailyIdSet`/`saveDailyIdSet`), que a su vez usa `NotificationsService` en **10 call-sites**.

## Por qué quedó pendiente (no es limpieza trivial)

1. **Carga inicial síncrona**: `NotificationsService` llama `loadDismissedFromStorage()`/`loadReadFromStorage()` en su inicialización (línea ~99-100), de forma síncrona. Migrar a `Async` implica decidir: ¿el primer render espera la carga (más lento pero correcto), o arranca con `Set` vacío y se actualiza después (riesgo de mostrar notificaciones ya leídas/descartadas por un instante)?
2. **8 call-sites de guardado** (`saveDismissedToStorage`/`saveReadToStorage`) son hoy fire-and-forget síncronos. Pasar a `Async` puede mantener ese patrón (no bloquear la UI), pero hay que confirmar que no se pierden escrituras si el usuario navega rápido.
3. Toca 3 archivos con una decisión de arquitectura real — dispara la regla de diseño obligatorio del proyecto (`chat-modes.md`: 3+ archivos o decisiones de arquitectura → `/design` antes de `/execute`).

## Deliverables

### Fase de diseño
1. Decidir el comportamiento de carga inicial (bloqueante vs. optimista con actualización diferida).
2. Confirmar que el patrón fire-and-forget en los 8 call-sites de guardado es aceptable con la versión `Async`, o si alguno necesita `await`.

### Fase de ejecución
1. Migrar `notifications-persistence.helper.ts` (`loadDaily`/`saveDaily`) a las versiones `Async`.
2. Ajustar `notifications.service.ts` en los 10 call-sites según la decisión de diseño.
3. Borrar los 4 métodos síncronos deprecados de `storage.service.ts` (`getDismissedNotifications`, `setDismissedNotifications`, `getReadNotifications`, `setReadNotifications`) y su fallback síncrono si queda huérfano (`_getSyncFallback`/`_setSyncFallback` — verificar otros usos antes de tocar).

## Decisiones de diseño

1. **Carga inicial**: `checkNotifications()` ya dispara una llamada HTTP (`api.getActivas()`), que siempre tarda más que una lectura IndexedDB. Se secuenció `await` de `loadDismissedFromStorage()` + `loadReadFromStorage()` (ahora async) dentro de un método `initialize()` invocado sin esperar desde el constructor, **antes** de llamar a `checkNotifications()`. Sin parpadeo: los signals de activas/descartadas quedan vacíos hasta que resuelve el fetch de todos modos.
2. **Guardado (8 call-sites)**: se mantiene fire-and-forget (`void saveDailyIdSet(...)`) sin `await`. Verificado en `NotificationStorageService`: sus métodos async nunca rechazan (atrapan y loguean el error internamente, siempre resuelven) — no hay riesgo de unhandled rejection ni pérdida silenciosa de escritura.
3. `_setSyncFallback` quedó huérfano tras borrar los 4 setters síncronos (únicos 2 call-sites) — se borró. `_getSyncFallback` se mantuvo: lo siguen usando los getters `Async` (fallback) y `migrateFromLegacyStorage()`.

## Criterio de cierre

- [x] `NotificationsService` usa las 4 versiones `Async` en todos los call-sites
- [x] Los 4 métodos síncronos deprecados están borrados de `storage.service.ts`
- [x] `ng build` pasa (sin errores ni warnings)
- [x] Notificaciones (leídas/descartadas) se comportan igual en browser: persisten tras refresh, no hay parpadeo visible — **verificado en browser**: se levantó BE + FE local, se activó temporalmente `features.notifications` (revertido al cerrar), se creó una notificación de prueba vigente hoy, se marcó como leída y se descartó. Confirmado en `EducaWebDB` (IndexedDB) que ambos estados (`read`/`dismissed`) persisten correctamente, y tras refresh el panel muestra "1 descartada" sin parpadeo ni errores de consola. Notificación de prueba borrada (soft-delete → Inactivo) al terminar.

## Tiempo estimado

~45 min (design 15 min + execute 30 min).
