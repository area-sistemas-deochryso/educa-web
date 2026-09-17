# 693 — Audit Tests F5: gaps de infraestructura WAL/integration

> **Repo destino**: `educa-web`
> **Plan**: [`audit-tests-frontend-2026-09-16.md`](../../plan/audit-tests-frontend-2026-09-16.md) (Fase F5)
> **Creado**: 2026-09-16 · **Estado**: ✅ cerrado 2026-09-17.
> **MODO SUGERIDO**: `/execute`
> **touches**: `core/integration/*.spec.ts`, `core/services/wal/{wal-leader,wal-sync-engine}.service.spec.ts`, `core/services/notifications/notifications.service.spec.ts`, `core/services/storage/storage-security.contract.spec.ts`, `core/services/session/session-coordinator.service.spec.ts`

## Origen

Hallazgos de `/audit` (2026-09-16), categoría **Riesgo** — gaps de infraestructura transversal (WAL, integration tests, sesión) donde la cobertura existente es mucho menor que el tamaño/complejidad real de la implementación, o donde el propio mecanismo de test (mocks, `afterEach`) esconde fallos reales.

## Scope

1. **`error-recovery.integration.spec.ts:67-108`** — "should handle 401 by attempting token refresh" y "should force logout when 401 refresh fails" envuelven sus asserts críticos en `if (refreshReq.length > 0) { ... }`. Si la implementación deja de disparar el refresh en un 401, el bloque se salta entero y el test pasa igual (falso negativo puro). Fix: quitar el `if` — el test debe fallar duro si no hay request de refresh, no saltarse el assert.
2. **`login-flow.integration.spec.ts`, `guard-permisos.integration.spec.ts`, `error-recovery.integration.spec.ts`** — los tres usan `httpMock.match(() => true).forEach((r) => r.flush(null))` en `afterEach` en vez de `httpMock.verify()`. Esto absorbe silenciosamente cualquier request HTTP inesperado/duplicado. Fix: reemplazar por `httpMock.verify()` (patrón ya usado en los specs unitarios de interceptors) y ajustar cada test para dejar mockeadas exactamente las requests esperadas.
3. **`wal-leader.service.spec.ts`** — faltan tests de: fallback sin `BroadcastChannel` disponible, reclamo de liderazgo por timeout del líder anterior, y propagación del mensaje `RELEASE`.
4. **`wal-sync-engine.service.spec.ts`** — el timer periódico (`interval(SYNC_INTERVAL_MS)`) nunca se ejercita con fake timers; agregar test que avance el reloj (`vi.advanceTimersByTime`) y confirme que `processRetryable()` se dispara por tick.
5. **`notifications.service.spec.ts`** — 104 líneas de test contra 371 de implementación. Faltan: `checkNotifications()`, dismiss/restore, computed signals derivados, y manejo de mensajes del Service Worker. Ampliar cobertura de los flujos principales del servicio.
6. **`storage-security.contract.spec.ts:97-127`** — el test de "cleanup exhaustivo" solo verifica `toHaveBeenCalledTimes`, no que las claves sensibles realmente desaparezcan del storage. Fix: verificar el estado real del storage (mock o real) tras el cleanup, no solo el conteo de llamadas.
7. **`session-coordinator.service.spec.ts:145-193`** — "detección de login con usuario distinto" no espía el `logger.warn` distintivo de ese caso; pasaría igual aunque se borre esa rama. Agregar assert sobre el log.

## Pre-work

- Punto 2 es el de mayor esfuerzo relativo (afecta 3 archivos, requiere revisar qué requests dispara cada test para no sub-mockear tras el cambio a `verify()`) — hacerlo primero para descubrir temprano si algún test estaba pasando "de casualidad" gracias al flush-all.

## Out of scope

- F1 (ya cubre el gap específico de `wal.service.spec.ts` sobre casing).
- Servicios WAL sin hallazgos (`wal-circuit-breaker`, `wal-coalescer`, `wal-cache-invalidator`, `wal-reconciler`, `wal-sync-recovery`, `wal-db`, ambas storage strategies) — confirmados sin problemas por el audit.

## Criterio de cierre

- [x] Los 7 puntos cubiertos.
- [x] Build + lint + tests OK.
- [x] Plan actualizado: F5 → ✅.
- [x] Maestro actualizado.

## Cierre (2026-09-17)

- Punto 2 primero como pedía el pre-work: `verify()` reveló 2 requests ocultas — `POST /api/sistema/errors` (reporter fire-and-forget, mockeado como sink con spec propio) y `POST /api/Auth/logout` real en guard-permisos (ahora flusheado explícito). login-flow sin requests ocultas (6/6 directo).
- Punto 1: asserts 401 duros (`toHaveLength(1)` en refresh + retry) + `resetErrorInterceptorState()` en beforeEach.
- Punto 3: fallback sin BroadcastChannel, takeover por timeout sin RELEASE (partición de canal), propagación RELEASE en destroy.
- Punto 4: tick periódico dispara `processRetryable` 1×/2× con `advanceTimersByTimeAsync` (fake timers antes del setup).
- Punto 5: `notifications.service.spec.ts` 8→15 tests (api/sound/smart mockeados; checkNotifications ordenado+computeds+sonido, fallback error, dismiss/restore round-trip con re-check, SW PUSH_RECEIVED/NOTIFICATION_CLICKED con flag flip + stub).
- Punto 6: `clearAll` verifica estado real (schedule/localStorage); mock alineado a `clearNotifications` (antes `clearAll`, inexistente — `clearAll()` real hubiera lanzado). Hallazgo documentado: `educa_last_notif_check` benigno sobrevive al cleanup.
- Punto 7: spy sobre `logger.warn` + caso negativo mismo-usuario.
- Total: 97/97 verdes en los 8 specs tocados. Lint 0 errores, `tsc --noEmit` limpio.

## Tiempo estimado

~3h.
