# FE WAL Resilience M3 — Strategy pattern + InMemory fallback

> **Repo destino**: `educa-web` (main)
> **Plan**: WAL Resilience · **Chat**: M3 · **Fase**: F2.Execute
> **Creado**: 2026-05-04 · **Modo sugerido**: `/execute`
> **Estado**: ✅ implementado · ⏳ pendiente smokes post-deploy
> **Validación prod**: ⏳ pendiente desde 2026-05-04 (Firefox modo privado · quota lleno simulado)
> **Bloqueado por**: chat 092 (M1+M2) — depende de `WalStatusStore.mode` agregado allí. ✅ ya cerrado.

## CONTEXTO INMEDIATO

Diseño completo en [.claude/documentacion-subsistemas/wal-resilience-degradation.md](../../documentacion-subsistemas/wal-resilience-degradation.md) — sección M3.

**Problema**: `WalDbService.initDB()` puede fallar en navegación privada (Firefox/Safari), cuota de almacenamiento llena, permiso revocado, BD corrupta. Hoy, cuando `dbReady` resuelve `false`, todas las operaciones del WAL son **no-ops silenciosas** — el usuario edita, `apply` corre, la entry no se persiste, el HTTP responde, los callbacks no encuentran entry asociada y los rollbacks fallan.

## OBJETIVO

Convertir `WalDbService` en strategy pattern. Si IndexedDB no inicializa en 5s o falla → degradar transparentemente a `InMemoryStrategy` (Map en memoria) y marcar `WalStatusStore.mode = 'ephemeral'`.

El banner de M2 ya muestra el aviso "Modo reducido" cuando `mode === 'ephemeral'` — esta tarea solo ha de cablear la causa.

## TOUCH LIST

### Archivos nuevos

- `src/app/core/services/wal/storage/wal-storage.strategy.ts` — interface `WalStorageStrategy` con métodos `add/get/getAll/getByStatus/update/delete/clear` + `readonly mode`.
- `src/app/core/services/wal/storage/wal-storage-indexeddb.strategy.ts` — implementación que extrae la lógica actual de `WalDbService`. Init con timeout duro de 5s.
- `src/app/core/services/wal/storage/wal-storage-memory.strategy.ts` — `Map<string, WalEntry>` con cap duro de 500 entries (al exceder, descarta la más vieja con `logger.error`).
- `src/app/core/services/wal/storage/wal-storage-indexeddb.strategy.spec.ts`
- `src/app/core/services/wal/storage/wal-storage-memory.strategy.spec.ts`

### Archivos modificados

- `src/app/core/services/wal/wal-db.service.ts`
  - Refactor a fachada: selecciona la strategy en init.
  - Si `IndexedDBStrategy.init()` resuelve `false` → swap a `InMemoryStrategy` + `walStatusStore.setMode('ephemeral')`.
  - Todos los métodos públicos delegan a `this.strategy`.
  - **Contrato externo idéntico**: ningún consumidor cambia.
- `src/app/core/services/wal/wal-sync-recovery.service.ts`
  - Skip recovery si `walStatusStore.mode() === 'ephemeral'` — no hay nada que recuperar entre sesiones.
- `src/app/core/services/wal/wal-metrics.service.ts`
  - Incluir `mode` en el snapshot de métricas (para diagnóstico en logs de prod).
- `src/app/core/services/wal/wal-db.service.spec.ts`
  - Test: mockear `indexedDB.open` para fallar → strategy queda en `InMemoryStrategy`.
  - Test: contrato `add → get → update → delete` idéntico en ambas strategies.
  - Test: cap de 500 en InMemoryStrategy descarta la más vieja.

## INVARIANTES NUEVAS

- `INV-WAL-RES08` — `WalDbService` **debe** seguir funcionando aunque IndexedDB esté indisponible. La degradación a `ephemeral` es transparente para los consumidores.
- `INV-WAL-RES09` — En modo `ephemeral`, `WalStatusStore.mode === 'ephemeral'` y el banner UI lo refleja.
- `INV-WAL-RES10` — Timeout de 5s para inicialización de IndexedDB es duro: si no responde, se asume no-disponible.

## RIESGOS

| Riesgo | Mitigación |
|--------|-----------|
| Refactor de servicio crítico rompe consumidores existentes | Contrato público idéntico. Tests de regresión sobre el contrato. |
| Cap de 500 entries explota en offline largo | Logs de error al descartar; M2 banner ya alerta sobre el modo reducido. |
| `Map` en memoria filtra entre tests | Strategy es `@Injectable({providedIn: 'root'})` — TestBed reset entre tests. |
| Init de 5s bloquea boot del WAL | El init es async, no bloquea — el engine espera vía `dbReady`. |

## DEFINICIÓN DE HECHO

- [ ] Lint y tipado limpios.
- [ ] Tests nuevos pasan; los existentes de `WalDbService` siguen pasando sin modificarse.
- [ ] Manual: abrir intranet en Firefox modo privado → banner "Modo reducido" aparece → mutaciones funcionan en sesión → reload pierde la cola (esperado).
- [ ] Manual: storage quota lleno (DevTools → Application → Storage → simulate full) → mismo comportamiento.
- [ ] Doc actualizada.
- [ ] Commit en main.

## REFERENCIAS

- Diseño: [wal-resilience-degradation.md](../../documentacion-subsistemas/wal-resilience-degradation.md) §M3.
- Subsistema base: [wal-write-ahead-log.md](../../documentacion-subsistemas/wal-write-ahead-log.md).

## NEXT

Tras cerrar este chat, abrir 094 (M4 — schema fingerprint).
