# 663 — Audit F1: Bugs críticos de fugas/reliability

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F1)
> **Creado**: 2026-09-12 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **touches**:
>   - `src/app/features/intranet/pages/admin/sistema/runtime-health/services/runtime-health.facade.ts`
>   - `src/app/features/intranet/pages/admin/sistema/diagnostico-db/services/diagnostico-db.facade.ts`
>   - `src/app/features/intranet/pages/admin/sistema/runtime-health/components/runtime-health-history/runtime-health-history.component.ts`
>   - `src/app/features/intranet/pages/admin/sistema/diagnostico-db/components/resource-stats-chart/resource-stats-chart.component.ts`
>   - `src/app/core/services/wal/storage/wal-storage-indexeddb.strategy.ts`
>   - `src/app/core/services/wal/wal-leader.service.ts`, `wal-sync-engine.service.ts`

## Origen

Hallazgos de `/audit` (2026-09-12), categoría "Bug" — 4 hallazgos de fugas/reliability agrupados por afinidad (recursos que nunca se liberan / errores que se tragan en silencio).

## Scope

1. **`sistema/runtime-health.facade.ts:22-58`** y **`sistema/diagnostico-db.facade.ts:12-49`** — ambos son `providedIn:'root'` con `setInterval` (60s y 30s respectivamente) arrancado en `init()`. El `DestroyRef` inyectado es del injector raíz, no del componente de página — el poll **nunca se detiene** al navegar fuera de la página, corre el resto de la sesión. Fix: scopear el facade al componente (`providers: [RuntimeHealthFacade]` en la página) o exponer `stopPolling()` explícito llamado desde `ngOnDestroy` del componente.
2. **`runtime-health-history.component.ts`** y **`resource-stats-chart.component.ts`** — crean instancias de Chart.js (`createCharts`) sin `ngOnDestroy` que llame `destroyChart()`/`destroyCharts()` (en `resource-stats-chart` el método existe pero solo se invoca al reemplazar un chart viejo, nunca en destroy). Leak de memoria en navegación repetida entre tabs. Fix: llamar `destroy()` de cada chart en `ngOnDestroy`.
3. **`wal-storage-indexeddb.strategy.ts:86-97,106-108` (`put`)** — cuando `tx.onerror` dispara por un error que NO es `QuotaExceededError`, el código llama `resolve()` en vez de `reject()`. El caller (`WalService.append`/`markCommitted`/etc.) cree que la escritura persistió cuando falló silenciosamente, pudiendo perder mutaciones offline sin fallback ni retry. Fix: solo swallowear el caso deliberado (`QuotaExceededError`); todo lo demás debe `reject()`.
4. **`wal-leader.service.ts` + `wal-sync-engine.service.ts:99-121`** — `_isLeader` se marca `true` síncronamente antes de resolver el empate entre pestañas vía `BroadcastChannel` (async). Dos pestañas abiertas casi simultáneamente pueden ambas ejecutar `processAllPending()` sobre las mismas entradas antes de resolverse quién es líder real → requests HTTP duplicados. Fix: grace period o ACK explícito antes de habilitar `isLeader`.

## Pre-work

- Puntos 1-2 son fixes acotados de bajo riesgo, verificables con Chrome DevTools (Network tab para confirmar que el polling se detiene al navegar; Memory profiler para confirmar liberación de charts).
- Puntos 3-4 tocan el módulo WAL (ya auditado y cerrado como plan aparte, ver "Auditoría WAL + Cache" en el maestro) — verificar con tests existentes del módulo antes y después del fix, no asumir que el comportamiento offline actual es intencional sin confirmar.

## Out of scope

- El resto de hallazgos del audit (ver plan — fases F2 a F12).
- No tocar el resto del módulo WAL más allá de los 2 puntos señalados (`wal-storage-indexeddb.strategy.ts`, `wal-leader.service.ts`/`wal-sync-engine.service.ts`).

## Criterio de cierre

- [ ] Build + lint + tests OK.
- [ ] Puntos 1-2 verificados: navegar a `sistema/runtime-health` o `diagnostico-db`, salir, confirmar en Network/Memory tab que el polling se detiene y los charts se liberan.
- [ ] Puntos 3-4 verificados con test de regresión sobre el módulo WAL (simular error no-quota en IndexedDB; simular 2 pestañas compitiendo por liderazgo).
- [ ] Plan actualizado: F1 → ✅.
- [ ] Maestro actualizado.

## Tiempo estimado

~90 min.
