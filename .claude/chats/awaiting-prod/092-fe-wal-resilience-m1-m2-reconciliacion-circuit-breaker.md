# FE WAL Resilience M1+M2 — Reconciliación post-reload + Circuit breaker

> **Repo destino**: `educa-web` (main)
> **Plan**: WAL Resilience · **Chat**: M1+M2 · **Fase**: F2.Execute
> **Creado**: 2026-05-04 · **Modo sugerido**: `/execute`
> **Estado**: ⏳ pendiente arrancar
> **Bloqueado por**: chat 085 (split engine) debe cerrar primero — toca los mismos archivos.

## CONTEXTO INMEDIATO

Diseño completo en [.claude/documentacion-subsistemas/wal-resilience-degradation.md](../../documentacion-subsistemas/wal-resilience-degradation.md) — secciones M1 y M2.

**Problema que resuelve M1**: cuando la app recarga (refresh, deploy, crash) con entries `IN_FLIGHT`, el recovery las re-procesa pero los callbacks vivían en memoria → `onCommit` y rollback nunca corren → estado optimista huérfano. El cache se invalida pero los componentes montados siguen viendo el snapshot que `apply` dejó hasta que el usuario navegue.

**Problema que resuelve M2**: el WAL retrying al infinito (bounded por `maxRetries` por entry) cuando el servidor está caído, sin ninguna señal global. El usuario sigue editando → cambios se acumulan → cuando expiran retries, ve N rollbacks en cascada.

**Por qué juntos**: M2 da visibilidad UI a M1 (sin M2 los commits huérfanos pasan invisibles). Tocan los mismos archivos (`WalSyncEngine`, `WalStatusStore`).

## OBJETIVO

1. **M1**: tras commit sin callback (recuperado de sesión previa) → invalidar cache + disparar `cacheUpdated$` para que componentes SWR re-fetcheen automáticamente.
2. **M2**: contar fallos retryable consecutivos. A los 5 → estado `open`. Tras 30s → `half-open` con sonda. Banner UI no-bloqueante con "Reintentar ahora".

## TOUCH LIST

### Archivos nuevos

- `src/app/core/services/wal/wal-reconciler.service.ts` — `notifyOrphanedCommit(entry)` → llama `sw.refetchByPattern` por cada patrón en `WAL_CACHE_MAP`.
- `src/app/core/services/wal/wal-circuit-breaker.service.ts` — encapsula transiciones closed/open/half-open + threshold (5) + cooldown (30s).
- `src/app/shared/components/wal-degraded-banner/wal-degraded-banner.component.ts` — presentational, lee `walStatusFacade.vm()`, muestra cuando `isDegraded`.
- `src/app/shared/components/wal-degraded-banner/wal-degraded-banner.component.html`
- `src/app/shared/components/wal-degraded-banner/wal-degraded-banner.component.scss`

### Archivos modificados

- `src/app/core/services/wal/wal-sync-engine.service.ts`
  - `processEntry` branch éxito sin callback → invocar `reconciler.notifyOrphanedCommit(entry)`.
  - `handleError` branch retryable → `circuitBreaker.recordFailure()`.
  - `handleError` branch éxito → `circuitBreaker.recordSuccess()`.
  - Antes de procesar pending entries → chequear `circuitBreaker.canProcess()`.
- `src/app/core/services/wal/wal-status.store.ts`
  - Signals nuevos: `_mode` (default `'persistent'`), `_circuitState` (default `'closed'`), `_consecutiveFailures` (default `0`), `_circuitOpenedAt` (default `null`).
  - Computed `isDegraded`, `bannerMessage`.
  - Setters correspondientes.
  - Extender `vm()` con los nuevos campos.
- `src/app/core/services/wal/wal-status.facade.ts`
  - Método `forceRetry()` → llama `circuitBreaker.forceProbe()` + dispara `processAllPending`.
- `src/app/features/intranet/services/sw/sw.service.ts`
  - Método nuevo `refetchByPattern(pattern: string): Promise<number>` — itera URLs cacheadas que matchean el patrón, fuerza fetch, emite `cacheUpdated$`. No-op si `!isRegistered`.
- `src/app/features/intranet/components/intranet-layout/intranet-layout.component.html`
  - Montar `<app-wal-degraded-banner />` arriba del header.
- `src/app/core/services/wal/index.ts`
  - Export de los nuevos servicios.

### Tests

- `wal-reconciler.service.spec.ts` — `notifyOrphanedCommit` invoca `sw.refetchByPattern` por cada patrón mapeado; no-op cuando no hay patrones.
- `wal-circuit-breaker.service.spec.ts` — 5 fallos consecutivos abren; success resetea contador; 4xx no incrementa; transición open→half-open tras 30s; half-open con success cierra.
- `wal-sync-engine.service.spec.ts` — agregar tests:
  - "commit sin callback dispara reconciler"
  - "circuit breaker open detiene processing"
  - "circuit breaker recordFailure solo con retryable"
- `wal-degraded-banner.component.spec.ts` — render condicional según `isDegraded`; click "Reintentar ahora" llama `forceRetry`.

## INVARIANTES NUEVAS

Agregar al final de la sección `INV-WAL-RES##` en [wal-resilience-degradation.md](../../documentacion-subsistemas/wal-resilience-degradation.md):

- `INV-WAL-RES01` — Todo commit sin callback registrado **debe** disparar `refetchByPattern` para los patrones del `resourceType`.
- `INV-WAL-RES02` — `refetchByPattern` es no-op silencioso si SW no está registrado.
- `INV-WAL-RES04` — Circuit breaker solo cuenta fallos retryable. 4xx y 409 no abren circuit.
- `INV-WAL-RES05` — En `open`, el engine no procesa entries nuevas. Las `IN_FLIGHT` completan su ciclo.
- `INV-WAL-RES06` — Usuario puede forzar `open → half-open` con "Reintentar ahora".
- `INV-WAL-RES07` — Banner es no-bloqueante. Usuario sigue mutando — entries acumulan en `PENDING` hasta que cierre.

## RIESGOS

| Riesgo | Mitigación |
|--------|-----------|
| Cambios en `WalSyncEngine.processEntry` rompen entries en flight durante el deploy | Cambio aditivo: agrega un branch que ya existía como caso silencioso. Test de regresión sobre el path del callback presente. |
| Banner aparece en flapping de red intermitente | Threshold 5 fallos consecutivos + 30s cooldown evita falsos positivos cortos. |
| `refetchByPattern` dispara N requests al volver online | Cap en `Promise.all` por patrón. Misma cantidad que `cacheInvalidator` ya hace. |
| Circuit breaker mantiene entries en `PENDING` indefinidamente si no hay actividad | El timer periódico (`SYNC_INTERVAL_MS`) sigue corriendo y al transicionar half-open la sonda destraba. |

## DEFINICIÓN DE HECHO

- [ ] Lint y tipado limpios (`npm run lint`).
- [ ] Tests nuevos y existentes pasan (`npm test`).
- [ ] Smoke manual: editar usuario en intranet → forzar reload mientras IN_FLIGHT → tras volver, el dato visible es del servidor, no el optimista.
- [ ] Smoke manual: con backend retornando 503 → banner aparece a los ~5 retries → click "Reintentar ahora" cierra el banner cuando el backend vuelve.
- [ ] Doc actualizada con las invariantes finales en [wal-resilience-degradation.md](../../documentacion-subsistemas/wal-resilience-degradation.md).
- [ ] Commit en main.

## REFERENCIAS

- Diseño: [wal-resilience-degradation.md](../../documentacion-subsistemas/wal-resilience-degradation.md) §M1, §M2.
- Subsistema base: [wal-write-ahead-log.md](../../documentacion-subsistemas/wal-write-ahead-log.md).
- Cache SWR: [cache-swr.md](../../documentacion-subsistemas/cache-swr.md).
- Regla operativa: `@.claude/rules/optimistic-ui.md`.

## NEXT

Tras cerrar este chat, abrir 093 (M3 — IndexedDB fallback).
