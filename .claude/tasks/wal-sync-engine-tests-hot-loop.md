# Task — Tests directos del hot loop de `WalSyncEngine`

> **Creado**: 2026-05-04
> **Origen**: Cierre de DS1 (chat 085, brief `closed/085-wal-sync-engine-split.md`). Durante F1 (diagnóstico) se confirmó que el engine **no tiene specs directos**. El único spec que lo importa (`wal-facade-helper.service.spec.ts`) lo mockea — no ejercita su loop. Tras el split DS1, el código extraído (recovery + classifier) sí tiene specs nuevos, pero el engine en sí sigue sin red de seguridad.
> **Scope**: chat dedicado, medio día.

---

## Contexto

`WalSyncEngine` es el loop central del subsistema WAL. Hoy en 274 líneas efectivas (margen 26 al cap 300 tras DS1). Procesa entries pendientes, coordina leader election cross-tab, maneja retry/backoff, y emite resultados.

**Riesgo concreto**: con margen 26 al cap, **una sola adición razonable** (un nuevo método de orquestación, un guard adicional, telemetría extra) regresa al engine al límite. Refactorizarlo en ese momento sin specs propios es trabajo a ciegas.

---

## Áreas sin cobertura directa hoy

| Método / flujo | Qué hace | Por qué importa cubrirlo |
|---|---|---|
| `init()` | Constructor → leader.start → recovery.run → emit migrations → processAllPending → startListeners | Race condition documentada en el código (recovery debe completar antes de listeners) |
| `startListeners()` | Subscribe a `sw.isOnline$` + interval timer; ambos disparan procesamiento | Toggle de online/offline + tick del timer son los triggers principales del runtime |
| `processAllPending()` | Drain loop con coalescer, leader guard, online check | Hot path en reconnect — invariantes FIFO + leader |
| `processRetryable()` | Tick periódico con `recoverInFlight()` como safety net | Failsafe contra entries stuck IN_FLIGHT |
| `processEntry()` | Send + commit + invalidate + notify; outer try/catch resetea IN_FLIGHT | El reset a PENDING tras error inesperado es invariante crítico |
| `handleError()` (post-DS1) | Switch sobre `classifyWalError`: 3 paths (conflict / permanent / retryable-ok / retryable-max) | Cada path muta WAL state, callbacks, cache distinto |
| `handleCrossTabCommit()` | Follower tabs invalidan cache cuando otra tab commitea | Coherencia cross-tab |

---

## Plan de ejecución

### F1 — Setup del spec

- [ ] F1.1 Crear `wal-sync-engine.service.spec.ts` con TestBed + mocks de `WalService`, `SwService`, `WalLeaderService`, `WalMetricsService`, `WalCacheInvalidator`, `WalCoalescer`, `WalSyncRecovery`, `HttpClient`.
- [ ] F1.2 Helper `setupEngine(overrides)` que devuelve `{ engine, mocks }` para casos comunes.

### F2 — Tests de `init()` y lifecycle

- [ ] F2.1 `init()` espera a `recovery.run()` antes de `startListeners()` (race condition).
- [ ] F2.2 `init()` emite `REQUIRES_MIGRATION` por cada entry de `recovery.run().migrationEntries`.
- [ ] F2.3 `init()` llama `processAllPending` solo si online.
- [ ] F2.4 `stop()` desuscribe el timer y deja `_isRunning = false`.

### F3 — Tests de procesamiento

- [ ] F3.1 `processEntry` exitoso: marca IN_FLIGHT → commit → invalidate → notifyEntryCommitted → callback → emit COMMITTED.
- [ ] F3.2 `processEntry` con error y outer catch: resetea entry a PENDING vía `retryEntry`.
- [ ] F3.3 `processAllPending` no procesa si NO leader.
- [ ] F3.4 `processAllPending` no procesa si offline.
- [ ] F3.5 `processAllPending` drain loop: pickup de entries nuevas durante el procesamiento.
- [ ] F3.6 `processRetryable` corre `recoverInFlight()` como safety net.

### F4 — Tests de `handleError` (post-DS1)

- [ ] F4.1 Conflict path: `markConflict` + delete callback + emit CONFLICT (no rollback).
- [ ] F4.2 Permanent path: `markFailed(msg)` + invalidate + rollback + onError + emit FAILED con mensaje.
- [ ] F4.3 Retryable-ok path: `incrementRetry` actualiza, emite RETRYING con `nextRetryAt`.
- [ ] F4.4 Retryable-max path: `incrementRetry` retorna `FAILED`, ejecuta rollback + onError + emit FAILED.

### F5 — Tests cross-tab

- [ ] F5.1 `handleCrossTabCommit` invoca `invalidateForCrossTab` y emite COMMITTED.

### F6 — Validar

- [ ] F6.1 `npx vitest run src/app/core/services/wal/wal-sync-engine.service.spec.ts` verde.
- [ ] F6.2 Suite full sin regresiones.

---

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Mocks complejos por la cantidad de deps (8) | Helper `setupEngine` reutilizable. No replicar setup en cada test |
| Tests acoplados a la implementación interna | Verificar **comportamiento observable** (qué emite el subject, qué métodos llama en mocks), no estado privado |
| Mock de `interval` para test del timer | `vi.useFakeTimers()` + `vi.advanceTimersByTime(SYNC_INTERVAL_MS)` |
| Mock de `sw.isOnline$` (Observable) | Usar `Subject<boolean>` o `BehaviorSubject` para emitir transiciones |

---

## Criterios de éxito

- [ ] `wal-sync-engine.service.spec.ts` existe con ≥ 15 tests
- [ ] Cubre los 4 paths de `handleError` (post-DS1)
- [ ] Cubre la race condition de `init()` (recovery antes de listeners)
- [ ] Cubre el drain loop de `processAllPending`
- [ ] Suite full verde

## Beneficio

Cualquier refactor futuro del engine (otra extracción, optimización, telemetría) tiene red de seguridad. Sin estos tests, el engine es código intocable: cualquier cambio requiere QA manual completo del WAL en browser, que no existe formalmente (ver task `wal-integration-smoke-test.md`).
