# Robustez del Sistema Distribuido — Plan de Mejoras

## Estado: EN PROGRESO

> **Contexto**: Auditoría de robustez post-Codex (marzo 2026). El sistema ya tiene WAL, cache offline (SWR + Network-first), optimistic UI, SignalR, y rate limiting. Los gaps son de ingeniería de sistemas distribuidos, no de features.

---

## Tier 0 — Bugs Activos (arreglar ya)

### T0-1: Session stuck loop en quickLogin ✅ COMPLETADO

**Severidad**: Crítica | **Esfuerzo**: Bajo

**Problema**: Cuando una sesión almacenada expira en el servidor (o el servidor se reinicia y pierde las sesiones in-memory), `quickLogin()` fallaba con 404 pero la card de sesión seguía visible en el UI. El usuario podía clickear infinitamente sin salida.

**Segundo bug encontrado**: `switchSession` no tenía `silentHeaders`, causando que el error interceptor intentara refresh de JWT en un endpoint `[AllowAnonymous]` (loop inútil de refresh en 401 por device mismatch).

**Fix aplicado** (2 archivos):
- `src/app/core/services/auth/auth-api.service.ts`: Agregado `silentHeaders` a `switchSession()` para que errores se manejen localmente, no por el interceptor global
- `src/app/features/intranet/pages/login/login-intranet.component.ts`: `quickLogin()` ahora en error: (1) elimina la sesión muerta del signal, (2) muestra mensaje específico por tipo de error, (3) recarga sesiones del servidor, (4) muestra login form si no quedan sesiones

**Flujo corregido**:
```
Antes:  click → 404 → mensaje genérico → card sigue visible → loop infinito
Ahora:  click → 404 → card desaparece → mensaje claro → recarga servidor → form si vacío
```

---

## Tier 1 — Pérdida de Datos Silenciosa

### T1-1: QuotaExceededError en WAL silencia mutaciones ✅ COMPLETADO

**Severidad**: Alta | **Esfuerzo**: Bajo

**Problema**: `WalDbService.put()` hacía catch silencioso en errores de IndexedDB. Si el storage estaba lleno (`QuotaExceededError`), la mutación se perdía sin notificar al usuario.

**Fix aplicado** (2 archivos):
- `src/app/core/services/wal/wal-db.service.ts`: `put()` ahora rechaza la Promise en `QuotaExceededError` (tanto en `tx.onerror` como en catch síncrono)
- `src/app/core/services/wal/wal-facade-helper.service.ts`: catch block detecta `QuotaExceededError`, muestra toast de warning al usuario, y ejecuta fallback HTTP directo

---

### T1-2: Idempotencia parcial — header solo en fallback post-reload ✅ COMPLETADO

**Severidad**: Alta | **Esfuerzo**: Medio

**Problema**: `X-Idempotency-Key` solo se enviaba en `sendWithRawHttp()` (fallback post-reload). En sesión normal, el `http$()` de facades NO incluía el header.

**Fix aplicado** (1 archivo):

- `src/app/core/services/wal/wal-sync-engine.service.ts`: Eliminados `sendWithCallback()` y `sendWithRawHttp()`. Reemplazados por `sendRequest(entry)` y `sendHttp(entry)` unificados que SIEMPRE reconstruyen el request desde los datos de la entry con `X-Idempotency-Key` header. Los callbacks (`onCommit`/`onError`/`rollback`) se siguen ejecutando pero ya no controlan el HTTP call.

**Pendiente backend**: B2 — Middleware de idempotencia server-side para verificar y rechazar duplicados.

---

## Tier 2 — Correctitud Bajo Concurrencia

### T2-1: Coordinación multi-tab para WAL replay ✅ COMPLETADO

**Severidad**: Media-Alta | **Esfuerzo**: Medio

**Problema**: No hay coordinación entre tabs del navegador. Dos tabs pueden:

- Replay la misma WAL entry simultáneamente → requests duplicados al servidor
- Recibir eventos SignalR duplicados → invalidaciones duplicadas

**Fix aplicado** (3 archivos):

- `src/app/core/services/wal/wal-leader.service.ts` (nuevo): Leader election via `BroadcastChannel`. Usa heartbeat cada 3s, timeout de 9s. Conflicto de liderazgo resuelto por tab ID lexicográfico menor. Emite `entryCommittedByOtherTab$` para que tabs seguidoras invaliden cache.
- `src/app/core/services/wal/wal-sync-engine.service.ts`: `processAllPending()` y `processRetryable()` ahora verifican `leader.isLeader` antes de procesar. En commit exitoso, notifica a otras tabs via `leader.notifyEntryCommitted()`. Tabs seguidoras reciben `handleCrossTabCommit()` que invalida cache del recurso.
- `src/app/core/services/wal/index.ts`: Export del nuevo servicio.

**Flujo**:
```
Tab A (leader): WAL entry → processEntry → sendHttp → commitAndClean → notifyEntryCommitted
Tab B (follower): BroadcastChannel → handleCrossTabCommit → invalidateCache → entryProcessed$ → UI refresh
Tab A cierra → Tab B: LEADER_TIMEOUT → claimLeadership → se convierte en leader
```

---

### T2-2: Reconciliación post-reload — onCommit perdido ✅ COMPLETADO

**Severidad**: Media | **Esfuerzo**: Medio

**Problema**: Los callbacks de WAL (`onCommit`, `onError`) son in-memory. Tras reload:

1. WAL recovery encuentra entries PENDING
2. `processEntry()` ejecuta el HTTP (OK)
3. Entry se commitea exitosamente en el servidor
4. Pero `cb?.onCommit(result)` es undefined → store no se refresca
5. UI queda desincronizada hasta el próximo GET

**Fix aplicado** (3 archivos):

- `src/app/core/services/wal/models/wal.models.ts`: `WalProcessResult` tipo `COMMITTED` ahora incluye `resourceType` y `hadCallback` (boolean). Permite a facades detectar commits post-reload.
- `src/app/core/services/wal/wal-sync-engine.service.ts`: `processEntry()` emite `resourceType` y `hadCallback: !!cb` en el process result. Cache ya se invalidaba via `invalidateCacheForEntry()` — ahora las facades pueden diferenciar commits normales de post-reload.
- `src/app/core/services/wal/wal-facade-helper.service.ts`: Nuevo método `postReloadCommit$(resourceType)` que emite cuando un entry de ese resourceType se commitea sin callback (post-reload). Facades suscriben para disparar refetch.

**Uso en facades**:

```typescript
// En constructor del facade
this.walHelper.postReloadCommit$('horarios')
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(() => this.loadData());
```

---

## Tier 3 — Robustez a Largo Plazo

### T3-1: Migraciones de WAL entries ✅ COMPLETADO

**Severidad**: Baja-Media | **Esfuerzo**: Medio

**Problema**: `WalEntry` no tiene campo `version`. Si un deploy cambia la estructura de un endpoint o DTO, entries pendientes del deploy anterior fallan con 404/400 → mutación perdida como FAILED.

**Fix aplicado** (4 archivos):

- `src/app/core/services/wal/models/wal.models.ts`: Added `schemaVersion?: number` to `WalEntry`, `CURRENT_WAL_SCHEMA_VERSION = 1` constant, `REQUIRES_MIGRATION` status, `WalMigrationFn`/`WalMigrationRegistry` types.
- `src/app/core/services/wal/wal.service.ts`: `append()` now stamps `schemaVersion: CURRENT_WAL_SCHEMA_VERSION`. Added `checkSchemaMigrations()` (marks old entries), `getMigrationEntries()`, `discardMigrationEntries()`.
- `src/app/core/services/wal/wal-sync-engine.service.ts`: `initRecovery()` calls `checkSchemaMigrations()` and emits `REQUIRES_MIGRATION` results.
- `src/app/core/services/wal/wal-status.store.ts`: Tracks `migrationCount` signal + `hasMigrations` computed + `discardMigrationEntries()` command.

---

### T3-2: Observabilidad de sincronización ✅ COMPLETADO

**Severidad**: Media | **Esfuerzo**: Medio

**Problema**: Solo hay indicadores locales en UI (`WalStatusStore` con counts). No hay métricas de tasa de conflictos/fallos, latencia promedio, edad de entries, ni tamaño del WAL.

**Fix aplicado** (2 archivos):

- `src/app/core/services/wal/wal-metrics.service.ts` (nuevo): Development-only service tracking totalProcessed, totalCommits, totalFailures, totalConflicts, avgLatencyMs (rolling 50 samples), oldestPendingAgeMs, estimatedSizeBytes, clockSkewMs, totalCoalesced. All exposed as signals via `metrics` computed.
- `src/app/core/services/wal/wal-sync-engine.service.ts`: Records latency on successful commit via `walMetrics.recordLatency()`.

---

### T3-3: Clasificación de consistencia por operación ✅ COMPLETADO

**Severidad**: Media | **Esfuerzo**: Alto

**Problema**: Todas las operaciones WAL usan el mismo comportamiento (optimistic). El dominio requiere matices (server-confirmed para cierres de periodo, serialized para eliminaciones con dependencias).

**Fix aplicado** (3 archivos):

- `src/app/core/services/wal/models/wal.models.ts`: Added `WalConsistencyLevel` type (`'optimistic' | 'optimistic-confirm' | 'server-confirmed' | 'serialized'`), `consistencyLevel?` field on `WalEntry` and `WalMutationConfig`.
- `src/app/core/services/wal/wal.service.ts`: `append()` stamps `consistencyLevel` (default: `'optimistic'`).
- `src/app/core/services/wal/wal-facade-helper.service.ts`: `execute()` routes `server-confirmed`/`serialized` to `executeServerConfirmed()` which skips WAL+optimistic and calls HTTP directly. Shows offline warning if not connected.

---

### T3-4: Política de reloj y clock skew ✅ COMPLETADO

**Severidad**: Baja | **Esfuerzo**: Medio

**Problema**: WAL entries y cache TTL usan `Date.now()` local. Si el reloj del dispositivo está incorrecto, timestamps y TTL son poco fiables.

**Fix aplicado** (3 archivos):

- `src/app/core/services/wal/wal-clock.service.ts` (nuevo): Reads server `Date` header, computes exponential moving average of clock delta. Exposes `skewMs` signal, `hasSkew` computed (threshold: 5min via `WAL_DEFAULTS.CLOCK_SKEW_THRESHOLD_MS`), and `now()` method for adjusted timestamps. Logs warning on significant skew detection/resolution.
- `src/app/core/interceptors/clock-sync/clock-sync.interceptor.ts` (nuevo): Lightweight interceptor that reads `Date` header from API responses and feeds `WalClockService.recordServerTime()`.
- `src/app/app.config.ts`: Registered `clockSyncInterceptor` in the interceptor chain.

---

### T3-5: Invalidación de cache automática ✅ COMPLETADO

**Severidad**: Baja-Media | **Esfuerzo**: Medio

**Problema**: La invalidación de cache dependía exclusivamente de `WAL_CACHE_MAP` manual. Endpoints nuevos sin mapping dejaban cache stale.

**Fix aplicado** (1 archivo):

- `src/app/core/services/wal/wal-sync-engine.service.ts`: `invalidateCacheForEntry()` now falls back to `extractPatternsFromEndpoint()` when `WAL_CACHE_MAP` has no entry for the resourceType. Extracts base API path (e.g. `/api/Usuarios` from `https://host/api/Usuarios/123`). `handleCrossTabCommit()` also falls back to `/api/{resourceType}` pattern. `WAL_CACHE_MAP` remains the primary source for explicit mappings with multiple patterns.

---

### T3-6: Coalescencia de WAL entries por recurso ✅ COMPLETADO

**Severidad**: Media | **Esfuerzo**: Alto

**Problema**: Ediciones rápidas al mismo recurso crean múltiples WAL entries que pueden fallar en cadena por conflictos de rowVersion. Ej: 3 edits a Horario #10 → entry A OK, B falla 409, C falla 409.

**Fix aplicado** (2 archivos):

- `src/app/core/services/wal/wal-sync-engine.service.ts`: Added `coalesceEntries()` called at the start of `processAllPending()`. Groups PENDING UPDATE entries by `resourceType:resourceId`. For groups with 2+ entries, keeps only the latest (by timestamp), shallow-merges older payloads into it, and deletes stale entries from IndexedDB. CREATE/DELETE/TOGGLE/CUSTOM entries are never coalesced. Records coalescence count to `WalMetricsService`.
- `src/app/core/services/wal/wal.service.ts`: Added `updateEntryPayload(id, payload)` method for coalescence to persist merged payloads.

---

## Backlog del Backend

### B1: Persistir sesiones en BD en lugar de in-memory ✅ COMPLETADO

**Severidad**: Media | **Esfuerzo**: Medio

**Problema**: `SessionStoreService` usa `ConcurrentDictionary` (Singleton). Cada restart del servidor pierde TODAS las sesiones almacenadas. En Azure con deploys frecuentes, esto es disruptivo.

**Fix aplicado** (6 archivos):

- `Educa.API/Models/Auth/StoredSession.cs` (nuevo): Entidad EF Core con Data Annotations (`[Key]`, `[MaxLength]`, `[Required]`). Campos: Id (PK string 32), DeviceId, Dni, NombreCompleto, Rol, EntityId, SedeId, IpAddress, CreatedAt, ExpiresAt.
- `Educa.API/Data/ApplicationDbContext.cs`: `DbSet<StoredSession>` + 3 índices: `IX_StoredSession_DeviceId` (query principal), `UQ_StoredSession_Device_Rol_Entity` (deduplicación unique), `IX_StoredSession_ExpiresAt` (cleanup).
- `Educa.API/Interfaces/Services/ISessionStoreService.cs`: Interfaz migrada a async (`Task`-returning). `StoredSession` class movida a `Models/Auth/`. Importa `Educa.API.Models.Auth`.
- `Educa.API/Services/Auth/SessionStoreService.cs`: Reescrito con EF Core. Deduplicación via query + remove (en lugar de `ConcurrentDictionary`). `GetSessionsByDeviceAsync()` llama `CleanExpiredAsync()` como lazy cleanup. `GetSessionAsync()` auto-elimina sesiones expiradas.
- `Educa.API/Controllers/Auth/AuthController.cs`: Todos los métodos de sesión migrados a async (`await`). Importa `Models.Auth` para `StoredSession`.
- `Educa.API/Program.cs`: DI cambiado de `AddSingleton` a `AddScoped` (DbContext es Scoped).
- `Educa.API/Migrations/20260310191439_AddStoredSessions.cs`: Migración EF Core generada.

**Flujo**:
```
Antes:  Login → ConcurrentDictionary → server restart → sesiones perdidas → 404 en quickLogin
Ahora:  Login → SQL StoredSession table → server restart → sesiones intactas → quickLogin funciona
```

---

### B2: Middleware de idempotencia para endpoints de mutación ✅ COMPLETADO

**Severidad**: Alta (requiere T1-2) | **Esfuerzo**: Medio

**Problema**: El frontend enviaba `X-Idempotency-Key`, pero el backend no lo verificaba.

**Fix aplicado** (ya existente en el codebase):

- `Educa.API/Middleware/IdempotencyMiddleware.cs`: Lee `X-Idempotency-Key` del header en requests de mutación (POST/PUT/DELETE/PATCH). Busca en tabla `IdempotencyKeys` si ya se procesó. Si existe y no expirado: devuelve response cacheado. Si no: ejecuta, captura response, persiste en BD con TTL de 24h. Backward compatible: requests sin header pasan normalmente. Key scoped por ruta + userId para evitar colisiones.
- `Educa.API/Models/Sistema/IdempotencyKey.cs`: Modelo con Key, StatusCode, ResponseBody, ContentType, CreatedAt, ExpiresAt.
- `Educa.API/Data/ApplicationDbContext.cs`: DbSet registrado.
- `Educa.API/Migrations/20260303200000_AddIdempotencyKeys.cs`: Migración aplicada.
- `Educa.API/Program.cs` línea 642: `app.UseMiddleware<IdempotencyMiddleware>()` registrado después de auth y rate limiter.

---

## Resumen de Prioridades

| ID | Tarea | Severidad | Esfuerzo | Estado |
|----|-------|-----------|----------|--------|
| T0-1 | Session stuck loop | Crítica | Bajo | ✅ Completado |
| T1-1 | QuotaExceededError silencia WAL | Alta | Bajo | ✅ Completado |
| T1-2 | Idempotencia end-to-end | Alta | Medio | ✅ Completado |
| T2-1 | Multi-tab WAL coordination | Media-Alta | Medio | ✅ Completado |
| T2-2 | Reconciliación post-reload | Media | Medio | ✅ Completado |
| T3-1 | Migraciones WAL | Baja-Media | Medio | ✅ Completado |
| T3-2 | Observabilidad sync | Media | Medio | ✅ Completado |
| T3-3 | Clasificación consistencia | Media | Alto | ✅ Completado |
| T3-4 | Clock skew | Baja | Medio | ✅ Completado |
| T3-5 | Cache invalidación automática | Baja-Media | Medio | ✅ Completado |
| T3-6 | Coalescencia WAL | Media | Alto | ✅ Completado |
| B1 | Persistir sesiones en BD | Media | Medio | ✅ Completado |
| B2 | Middleware idempotencia backend | Alta | Medio | ✅ Completado |

## Archivos Clave

| Archivo | Rol |
|---------|-----|
| `src/app/core/services/wal/wal-db.service.ts` | Persistencia WAL en IndexedDB |
| `src/app/core/services/wal/wal-sync-engine.service.ts` | Motor de procesamiento y retry |
| `src/app/core/services/wal/wal-leader.service.ts` | Leader election multi-tab via BroadcastChannel |
| `src/app/core/services/wal/wal.service.ts` | Lifecycle y orquestación |
| `src/app/core/services/wal/models/wal.models.ts` | Modelos y constantes |
| `src/app/core/services/auth/auth-api.service.ts` | Gateway HTTP de auth |
| `src/app/features/intranet/pages/login/login-intranet.component.ts` | Login + stored sessions UI |
| `src/app/core/services/session/session-activity.service.ts` | Verificación y renovación de sesión |
| `src/app/core/services/wal/wal-clock.service.ts` | Clock skew detection via server Date header |
| `src/app/core/services/wal/wal-metrics.service.ts` | Dev-only sync observability metrics |
| `src/app/core/interceptors/clock-sync/clock-sync.interceptor.ts` | Reads Date header for clock skew |
| `src/app/core/interceptors/error/error.interceptor.ts` | Manejo global de errores HTTP |
| `Educa.API/Models/Auth/StoredSession.cs` | Entidad EF Core para sesiones persistidas |
| `Educa.API/Services/Auth/SessionStoreService.cs` | Session store backed by SQL Server |
| `public/sw.js` | Service Worker con cache strategy |
| `src/app/config/cache-versions.config.ts` | Versiones de cache por módulo |
