# Refactor: Organización, Responsabilidad y Claridad

> **Estado**: Completado (2026-03-28)
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

### Bloque 11: WAL Sync Engine (681 → ~380 + 3 helpers) ✅
- `wal-error.utils.ts` — Funciones puras: `isConflictError`, `isPermanentError`, `extractErrorMessage`
- `wal-cache-invalidator.service.ts` — Servicio para invalidación de cache SW post-commit
- `wal-coalescer.service.ts` — Servicio para merge de entries UPDATE duplicados

### Bloque 12: Templates >500 líneas (5 templates → sub-componentes) ✅
- `ctest-k6.component.html` (650 → ~170) — 3 wizard steps extraídos: config-step, stages-step, endpoints-step
- `campus.component.html` (590 → 217) — 4 dialogs extraídos: piso-dialog, node-dialog, bloqueo-dialog, vertical-connection-dialog
- `curso-content-dialog.component.html` (573 → 256) — 1 accordion extraído: semanas-accordion
- `horarios.component.html` (550 → 221) — 2 componentes extraídos: form-dialog, curso-picker
- `permisos-usuarios.component.html` (528 → 204) — 3 componentes extraídos: stats-cards, detail-drawer, edit-dialog

### Bloque 13: BaseCrudFacade — evaluado, no migrado ✅
- `BaseCrudFacade` ya existe y funciona bien (CursosFacade la usa correctamente)
- UsuariosCrudFacade y HorariosCrudFacade NO se migraron: sus stores son custom y no extienden BaseCrudStore, requeriría refactor de alto riesgo con beneficio marginal
- **Decisión**: usar BaseCrudFacade para módulos CRUD **nuevos**, no migrar los existentes

### Bloque 14: StorageService — evaluado, no requiere split ✅
- StorageService (628 ln) es un facade bien organizado con 6 regiones claras
- Delega correctamente a 3 sub-servicios (SessionStorage, Preferences, NotificationStorage)
- No necesita split — es el patrón correcto para una fachada de storage

---

## Reglas para mantener el orden post-refactor

1. **`*.models.ts` = solo tipos**. Funciones van en `*.utils.ts`
2. **1 servicio = 1 responsabilidad**. Si tiene "y" en la descripción, split
3. **Tipo usado en 2+ features → `@data/models/` o `@shared/models/`**
4. **Archivo >350 líneas → evaluar split**. >500 → obligatorio
5. **Config/constantes en `@shared/config/` o `@shared/constants/`**, nunca en `components/`
6. **Template >250 líneas → extraer sub-componentes presentacionales**
7. **Nuevos módulos CRUD admin → usar BaseCrudStore + BaseCrudFacade**
