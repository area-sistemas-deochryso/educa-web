# WAL + Event Sourcing: Mutaciones Garantizadas

## Contexto

Las mutaciones (POST/PUT/DELETE) van directo al servidor sin red de seguridad. Si falla la red, timeout, o el usuario cierra el navegador mid-request, la operacion se pierde. El WAL persiste toda mutacion en IndexedDB ANTES de enviarla, habilitando retry automatico, offline queue, optimistic UI y reconstruccion de estado.

**Decisiones arquitectonicas**:
- Intercepcion a nivel de Facade (no interceptor HTTP)
- Optimistic UI con rollback en fallo
- Idempotency Key en backend para retries seguros (`X-Idempotency-Key` header)

---

## Phase 1: WAL Infrastructure (Core Frontend) ✅

### 1.1 Modelos y tipos ✅
- [x] `src/app/core/services/wal/models/wal.models.ts`
  - WalOperation, WalHttpMethod, WalEntryStatus, WalEntry, WalMutationConfig<T>, WalProcessResult, WalStats, WAL_DEFAULTS

### 1.2 WalDbService ✅
- [x] `src/app/core/services/wal/wal-db.service.ts`
  - DB: `educa-wal-db`, Object Store: `wal-entries`
  - Metodos: put, get, getByStatus, getPending, getFailed, delete, deleteOlderThan, count

### 1.3 WalService ✅
- [x] `src/app/core/services/wal/wal.service.ts`
  - Ciclo de vida: append → markInFlight → markCommitted/markFailed/markConflict
  - Backoff: `min(1000 * 2^retries, 30000)`
  - Cleanup de COMMITTED > 24h

### 1.4 WalSyncEngine ✅
- [x] `src/app/core/services/wal/wal-sync-engine.service.ts`
  - Online/offline listener, timer cada 10s, FIFO processing
  - In-memory callbacks Map, raw HTTP fallback on reload

### 1.5 WalStatusStore ✅
- [x] `src/app/core/services/wal/wal-status.store.ts`
  - Signals: pendingCount, failedCount, isSyncing, failedEntries
  - Computed: hasPending, hasFailures, vm

### 1.6 WalFacadeHelper ✅
- [x] `src/app/core/services/wal/wal-facade-helper.service.ts`
  - execute() → optimistic → WAL append → send/queue
  - executeFallback() cuando IndexedDB no disponible

### 1.7 Barrel exports ✅
- [x] `src/app/core/services/wal/index.ts`
- [x] Export en `src/app/core/services/index.ts`

---

## Phase 2: Backend Idempotency ⏳ PENDIENTE

### 2.1 Modelo
- [ ] Crear `Educa.API/Models/IdempotencyKey.cs`

### 2.2 Middleware
- [ ] Crear `Educa.API/Middleware/IdempotencyMiddleware.cs`

### 2.3 DB y registro
- [ ] Agregar DbSet, migracion EF, registrar middleware en Program.cs

---

## Phase 3: Primera Integracion - Usuarios Facade ✅

- [x] Migrar create, update, delete, toggleEstado a `wal.execute()`
- [x] Optimistic UI con rollback en todas las operaciones
- [x] Agregar `addUsuario()` al store para rollback de delete

---

## Phase 4: UI Components ✅

- [x] `src/app/shared/components/sync-status/sync-status.component.ts` — indicador en header
- [x] `src/app/shared/components/pending-operations/pending-operations.component.ts` — drawer con lista
- [x] Integrado en `intranet-layout.component.html`

---

## Phase 5: Rollout a Todas las Facades ✅

### Cobertura completa: 35/35 mutaciones protegidas (100%)

| Facade | Operaciones WAL | Status |
|--------|-----------------|--------|
| `usuarios.facade.ts` | CREATE, UPDATE, DELETE, TOGGLE (4) | ✅ |
| `horarios.facade.ts` | CREATE, UPDATE, DELETE, TOGGLE, asignarProfesor, asignarEstudiantes, asignarTodosEstudiantes (7) | ✅ |
| `permisos-roles.facade.ts` | CREATE, UPDATE, DELETE (3) | ✅ |
| `cursos.facade.ts` | CREATE, UPDATE, DELETE, TOGGLE (4) | ✅ |
| `vistas.facade.ts` | CREATE, UPDATE, DELETE, TOGGLE (4) | ✅ |
| `permisos-usuarios.facade.ts` | CREATE, UPDATE, DELETE (3) | ✅ |
| `curso-contenido.facade.ts` | 7 standard + 1 hybrid (8) | ✅ |
| `attachments-modal.facade.ts` | 1 hybrid + 1 delete (2) | ✅ |

### curso-contenido: Detalle de 8 operaciones WAL

| Metodo | Operation | ResourceType | Notas |
|--------|-----------|-------------|-------|
| crearContenido | CREATE | CursoContenido | Optimistic close builder |
| eliminarContenido | DELETE | CursoContenido | Optimistic close dialog |
| actualizarSemana | UPDATE | CursoContenidoSemana | Optimistic update + snapshot rollback |
| uploadArchivo (step 2) | CREATE | CursoContenidoArchivo | **Hibrido**: blob direct + metadata WAL |
| eliminarArchivo | DELETE | CursoContenidoArchivo | Optimistic remove + snapshot rollback |
| crearTarea | CREATE | CursoContenidoTarea | Optimistic close dialog |
| actualizarTarea | UPDATE | CursoContenidoTarea | Optimistic update + snapshot rollback |
| eliminarTarea | DELETE | CursoContenidoTarea | Optimistic remove + snapshot rollback |

### attachments-modal: Detalle de 2 operaciones WAL

| Metodo | Operation | ResourceType | Notas |
|--------|-----------|-------------|-------|
| uploadFile (step 2) | CREATE | CursoContenidoArchivo | **Hibrido**: blob direct + metadata WAL |
| deleteAttachment | DELETE | CursoContenidoArchivo | Optimistic remove + snapshot rollback |

### Facades sin WAL (por diseño)

| Facade | Razon |
|--------|-------|
| `profesor.facade.ts` | Solo lectura (GET), sin mutaciones |
| `campus-navigation.facade.ts` | Solo lectura (GET), sin mutaciones |

---

## Phase 6: Log Compaction + Snapshotting ⏳ PENDIENTE

Diseño completo en plan file. Pendiente de implementacion:
- WalCompactionService (checkpoint, compactPending, cleanupCheckpoints, runMaintenance)
- DB upgrade v1→v2 (wal-checkpoints object store)
- Triggers: threshold (cada 50 commits), periodic (30 min), startup, visibilitychange

---

## Edge Cases y Mitigaciones

| Edge Case | Mitigacion |
|-----------|-----------|
| App se cierra mid-request | Entry queda PENDING/IN_FLIGHT. Al reabrir, SyncEngine reprocesa |
| Callbacks perdidas tras reload | SyncEngine re-envia sin callbacks (solo HTTP + mark) |
| Doble envio | Backend idempotency key previene duplicados |
| Conflicto de version | Server 409 → CONFLICT → usuario decide |
| IndexedDB no disponible | Fallback: ejecutar directo sin WAL |
| WAL crece indefinidamente | Cleanup 24h (actual) + Phase 6 compaction (pendiente) |
| Blob upload no es WAL-compatible | Hibrido: blob direct + metadata registration WAL |

---

## Archivos Creados

### Frontend (WAL Core)
| Archivo | Tipo |
|---------|------|
| `src/app/core/services/wal/models/wal.models.ts` | Modelos |
| `src/app/core/services/wal/wal-db.service.ts` | Service (IndexedDB) |
| `src/app/core/services/wal/wal.service.ts` | Service (lifecycle) |
| `src/app/core/services/wal/wal-sync-engine.service.ts` | Service (sync engine) |
| `src/app/core/services/wal/wal-status.store.ts` | Store (signals) |
| `src/app/core/services/wal/wal-facade-helper.service.ts` | Service (facade helper) |
| `src/app/core/services/wal/index.ts` | Barrel |
| `src/app/shared/components/sync-status/` | Component (header indicator) |
| `src/app/shared/components/pending-operations/` | Component (drawer panel) |

### Archivos Modificados (Facades migradas)
| Archivo | Operaciones WAL |
|---------|----------------|
| `admin/usuarios/usuarios.facade.ts` | 4 (CRUD + toggle) |
| `admin/horarios/services/horarios.facade.ts` | 7 (CRUD + toggle + 3 asignaciones) |
| `admin/permisos-roles/services/permisos-roles.facade.ts` | 3 (CUD) |
| `admin/cursos/services/cursos.facade.ts` | 4 (CRUD + toggle) |
| `admin/vistas/services/vistas.facade.ts` | 4 (CRUD + toggle) |
| `admin/permisos-usuarios/permisos-usuarios.facade.ts` | 3 (create + update + delete) |
| `profesor/cursos/services/curso-contenido.facade.ts` | 8 (7 standard + 1 hybrid) |
| `schedule/course-details-modal/attachments-modal/attachments-modal.facade.ts` | 2 (1 hybrid + 1 delete) |

### Backend (Pendiente)
| Archivo | Tipo |
|---------|------|
| `Educa.API/Middleware/IdempotencyMiddleware.cs` | Middleware (por crear) |
| `Educa.API/Models/IdempotencyKey.cs` | Model (por crear) |
