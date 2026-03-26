# Refactor: Organización, Responsabilidad y Claridad

> **Estado**: Completado (2026-03-26)
> **Objetivo**: Cada archivo tiene 1 responsabilidad clara, cada tipo tiene 1 ubicación, cada función tiene 1 dueño.

---

## Completado

### Bloque 1: Tipos compartidos y duplicados ✅
- `ApiResponse` consolidado en `@shared/models/api-response.models.ts` (eliminado de 3 archivos)
- DTOs movidos de repositories a `@data/models/user.models.ts` y `notification.models.ts`
- `asistencia.models.ts` movido a `@data/models/` (re-export en ubicación original)

### Bloque 2: Separación tipos/funciones ✅
- Creado `@shared/utils/` con 6 archivos de utilidades extraídas de `.models.ts`
- Los `.models.ts` ahora solo tienen tipos + re-exports de compatibilidad

### Bloque 3: Tipos inline extraídos ✅
- `NotaRow`, `GrupoNotaRow`, `GrupoMiembroInfo` → `profesor/models/calificar-dialog.models.ts`
- Funciones de calificación → `profesor/utils/calificacion.utils.ts`

### Bloque 4: Config reubicada ✅
- `intranet-menu.config.ts` → `@shared/config/`

### Bloque 5: AsistenciaService (593 → 4 por rol + facade) ✅
### Bloque 6: NotificationsService (535 → API + Sound + State) ✅
### Bloque 7: notifications.config.ts (699 → Types + DateUtils + Config) ✅
### Bloque 8: AttendanceViewService (753 → View + PDF + Stats) ✅
### Bloque 9: SessionActivityService (442 → Activity + Refresh + Coordinator) ✅
### Bloque 10: Funciones puras centralizadas ✅
- `CalificacionConfigService` → funciones puras en `@shared/utils/calificacion-config.utils.ts`
- `isJwtExpired` centralizado en `@core/helpers/jwt.utils.ts`

### Backlog completado ✅
- `horarios.store.ts` (656 → 478 + FormStore 123 + FilterStore 132)
- `voice-recognition.service.ts` (622 → 366 + Matcher 297 + Executor 98)
- `IndexedDBService` (637 → 110 + NotificationStorage 170 + CacheStorage 140 + SmartData 115)
- `ui-messages.ts` (360 → Confirm 70 + Errors 170 + Feature 130)
- `campus-admin.facade.ts` (494 → 437 + EditorService 182)

---

## Pendiente (al tocar cada feature)

- [ ] `StorageService` (628 ln) — simplificar cuando se toque storage
- [ ] `wal-sync-engine.service.ts` (680 ln) — evaluar split cuando se toque WAL
- [ ] Templates >500 líneas (5 templates) — extraer sub-componentes al tocar
- [ ] Considerar `BaseCrudFacade` cuando se creen 2+ facades nuevos

---

## Reglas para mantener el orden post-refactor

1. **`*.models.ts` = solo tipos**. Funciones van en `*.utils.ts`
2. **1 servicio = 1 responsabilidad**. Si tiene "y" en la descripción, split
3. **Tipo usado en 2+ features → `@data/models/` o `@shared/models/`**
4. **Archivo >350 líneas → evaluar split**. >500 → obligatorio
5. **Config/constantes en `@shared/config/` o `@shared/constants/`**, nunca en `components/`
