# 086 — Tests directos del hot loop de `WalSyncEngine`

> **Repo destino**: `educa-web` (main) · **Tipo**: Tests FE
> **Origen**: Cierre de DS1 (chat 085, brief `closed/085-wal-sync-engine-split.md`). Durante F1 se confirmó que el engine no tiene specs directos.
> **Creado**: 2026-05-04 · **Estado**: ⏳ pendiente arrancar
> **Modo sugerido**: `/execute` (plan ya está en la task) → `/validate`

## CONTEXTO INMEDIATO

Tras DS1 (commit `0a9f378`), `WalSyncEngine` quedó en **274 líneas efectivas (margen 26 al cap 300)**. El código extraído (`WalSyncRecovery` + `classifyWalError`) tiene specs nuevos (14 tests). El engine en sí **no tiene specs directos** — la única red de seguridad es `wal-facade-helper.service.spec.ts` que lo mockea, no lo ejercita.

**Riesgo concreto**: una sola adición razonable al engine (guard, telemetría, paso extra de orquestación) lo regresa al cap. Refactorizar sin specs es trabajo a ciegas sobre runtime crítico.

## OBJETIVO

Crear `wal-sync-engine.service.spec.ts` con cobertura del hot loop. Mínimo 15 tests cubriendo:

- `init()` race condition (recovery completa antes de listeners) + emit migrations + processAllPending si online
- `startListeners()` + `stop()` (timer + isOnline$)
- `processAllPending` happy path + drain loop + leader guard + offline guard
- `processRetryable` + safety net `recoverInFlight()`
- `processEntry` happy path + outer catch resetea IN_FLIGHT a PENDING
- `handleError` 4 paths (post-DS1: switch sobre `classifyWalError`)
- `handleCrossTabCommit`

## SCOPE

### Plan completo

Ver `tasks/wal-sync-engine-tests-hot-loop.md` con F1-F6 detallados.

### Setup técnico

- TestBed + `vi.useFakeTimers()` para el `interval` del timer
- `BehaviorSubject<boolean>` para `sw.isOnline$`
- 8 mocks (WalService, SwService, WalLeaderService, WalMetricsService, WalCacheInvalidator, WalCoalescer, WalSyncRecovery, HttpClient)
- Helper `setupEngine(overrides)` para no replicar setup

### Out of scope

- Tests de integración con IndexedDB real (eso es el smoke browser — task 087)
- Tests del flujo cross-tab con dos engines reales (mismo motivo)
- Refactor del engine (cualquier refactor lo decide el chat siguiente con esta red de seguridad ya en su lugar)

## CRITERIOS DE ÉXITO

- [ ] `wal-sync-engine.service.spec.ts` con ≥ 15 tests
- [ ] Cubre los 4 paths de `handleError` post-DS1
- [ ] Cubre la race de `init()` (recovery antes de listeners)
- [ ] Cubre el drain loop de `processAllPending`
- [ ] `npx vitest run src/app/core/services/wal/` verde
- [ ] Suite full sin regresiones (baseline 1798)

## REFERENCIAS

- Task: `tasks/wal-sync-engine-tests-hot-loop.md`
- Engine: `src/app/core/services/wal/wal-sync-engine.service.ts`
- Patrón a seguir: `wal-facade-helper.service.spec.ts` (mocks de TestBed con `useValue`), `wal-sync-recovery.service.spec.ts` (creado en DS1)
- Brief origen: `closed/085-wal-sync-engine-split.md`
