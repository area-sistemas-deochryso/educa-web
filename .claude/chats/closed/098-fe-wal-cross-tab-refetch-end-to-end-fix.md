# 098 · FE · WAL cross-tab refetch — end-to-end no actualiza Tab B (fix de 091)

> **Validación prod**: ✅ verificada 2026-05-06 — smoke Cowork ronda 2 CASO 091/098 (tab A creó curso, tab B follower vio Total Cursos 28→29 sin F5 en ~2s).
> **Repo destino**: `educa-web` (main)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-04 · **Modo sugerido**: `/investigate` → `/design` → `/execute`
> **Origen**: smoke Cowork 2026-05-04 caso WAL-1 ❌

## Hallazgo

Tras 2 commits exitosos en Tab A (cursos `SMOKE-COWORK-WAL1` + `SMOKE-COWORK-WAL1-X`), Tab B mantuvo `total: 25` durante **>8 segundos** y solo refrescó tras reload manual. Lo esperado: refetch silencioso ~1-2s tras el commit del leader.

`SETUP-COWORK.md` §6.4 ya documentaba el síntoma:

> "invalidateForCrossTab solo invalida SW cache, NO refetcha el store del componente"

El brief 091 (cerrado, en `closed/`) declaraba haber wireado `WalCrossTabRefetchService` en los 18 facades sin `BaseCrudFacade` + el helper `silentRefreshAfterCrud()` en `BaseCrudFacade`. **El wiring está, pero el refetch end-to-end no dispara.**

## Hipótesis a investigar

1. El observable `entryCommittedByOtherTab$` no se emite — leader no notifica a followers tras commit. Verificar `WalLeaderService` + canal BroadcastChannel/localStorage.
2. El observable se emite pero el `resourceType` filtrado en el subscribe no matchea — el `cursos` del wal.execute vs el `cursos` del subscribe podrían diferir en casing o singular/plural.
3. El subscribe está activo pero `silentRefreshAfterCrud()` cae en un guard temprano (loading, paginación, etc.) y no hace el GET.
4. El GET sale pero el store no aplica los datos (mutación quirúrgica en lugar de set completo).

## Repro mínimo

1. 2 tabs en `/intranet/admin/cursos`.
2. Console en ambos: `localStorage.setItem('DEBUG', 'WAL:*')` para ver eventos cross-tab.
3. Tab A: crear curso `DEBUG-CT-1`.
4. Tab A console: ver `[WAL] entry committed` con `entryId` y `resourceType`.
5. Tab B console: confirmar/refutar que aparece `[WAL-CrossTab] received commit, dispatching refetch resourceType=cursos` y `[BaseCrudFacade] silentRefreshAfterCrud invoked`.
6. Tab B Network: confirmar/refutar GET `/api/sistema/cursos`.

## Scope del fix

**Investigate (1ra fase)**: identificar cuál de las 4 hipótesis aplica. Logs estructurados temporales (`debug.dbg('WAL:CrossTab')`) en los 4 puntos sospechosos. Reportar con evidencia antes de modificar.

**Design+Execute (2da fase)**: dependiendo del hallazgo. Posibles soluciones:
- Si es hipótesis 1: arreglar emit del leader.
- Si es hipótesis 2: normalizar `resourceType` (snake-case canonical) en `WAL_CACHE_MAP`.
- Si es hipótesis 3: revisar guards en `silentRefreshAfterCrud()`.
- Si es hipótesis 4: cambiar a `setItems()` completo en lugar de mutación quirúrgica para refetch cross-tab.

## Tests

- Spec nuevo en `wal-cross-tab-refetch.service.spec.ts` que cubra emit + filter + dispatch.
- Smoke browser (caso WAL-1) debe pasar end-to-end tras el fix.

## Referencias

- Brief original: `closed/091-fe-wal-cross-tab-wire-remaining-facades.md`.
- Helper del cross-tab: `core/services/wal/wal-cross-tab-refetch.service.ts`.
- Documentación del subsistema: `claude-cowork/SETUP-COWORK.md` §6.4.
- Reglas: `rules/optimistic-ui.md` (sección "Refetch cross-tab tras commit del leader").

---

## Cierre — 2026-05-05

### Hipótesis confirmada

Ninguna de las 4 hipótesis originales aplicó. La cadena cross-tab end-to-end estaba correctamente cableada (broadcast leader → handler follower → subject filter → callback) — los logs temporales en los puntos A-D firmaron OK en ambos tabs.

**Causa raíz real** (no estaba en la matriz): **asimetría de contrato** entre el callback local del leader (`cb.onCommit`) y el callback registrado en el canal cross-tab. El leader refrescaba items + stats vía `silentRefreshAfterCrud()` + `refreshEstadisticas()` por separado. El follower solo ejecutaba `silentRefreshAfterCrud()` (omitía estadísticas silenciosamente).

Síntoma: Tab A creaba curso → Tab A counter "Total Cursos" 26 → 27 ✅. Tab B (observador) la lista refrescaba pero el counter quedaba en 26 ❌.

### Fix aplicado (scope C — endurecimiento sistémico)

Cambio la firma de `WalCrossTabRefetchService.subscribe`:

- `refetchItems: () => void` — obligatorio.
- `refetchStats?: () => void` — opcional pero requerido si el feature tiene endpoint de estadísticas.

TypeScript ahora fuerza la decisión explícita: cualquier facade nuevo que se suscriba al cross-tab debe pasar `refetchItems`. Si tiene stats endpoint y los omite, es decisión consciente — no un olvido.

### Archivos tocados

| Capa | Cantidad | Detalle |
|---|---:|---|
| Helper WAL | 1 | `wal-cross-tab-refetch.service.ts` (firma nueva) |
| BaseCrudFacade | 1 | `base-crud.facade.ts` (`initCrossTabRefetch` pasa ambos) |
| Facades manuales | 17 | rename `refetch:` → `refetchItems:` |
| Facades con stats nuevos | 3 | `usuarios-data` (+ método `refreshEstadisticasOnly`), `attendances-data`, `feedback-reports` |
| Spec actualizado | 1 | `cursos.facade.spec.ts` (mock cross-tab refleja firma nueva) |
| Docs `.claude/` | 6 | `rules/{debug,optimistic-ui,service-worker}.md` + `documentacion-subsistemas/{wal-write-ahead-log,service-worker-scope}.md` + `claude-cowork/SETUP-COWORK.md` |

### Hallazgos colaterales documentados

1. **SW agresivo en dev sirviendo bundle stale** → `rules/service-worker.md` § "SW activo en dev" + `documentacion-subsistemas/service-worker-scope.md` §3 (decisión: no desactivar SW en dev por tradeoff de bugs en cache aparezcan temprano).

2. **`logger.log()` no emite en `ng serve`** (Angular 21 + esbuild stripping `ngDevMode`) → `rules/debug.md` § "Quirk: Angular 21 + esbuild" (workaround: `console.log` directo con tag `// TEMP debug NNN` para debugging puntual; deuda técnica anotada para fix permanente del gate `enabled`).

3. **Asimetría items+stats en cross-tab** → `documentacion-subsistemas/wal-write-ahead-log.md` §7.1 (cross-tab reconciliation + contrato del refetch).

### Validación

| Capa | Resultado |
|---|---|
| TypeScript (`npx tsc --noEmit`) | ✅ 0 errors |
| Tests (`npx vitest run` WAL + facades + cursos) | ✅ 165/165 |
| Lint (`ng lint`) | ✅ 0 errors (1 warning pre-existente unrelated) |
| Smoke browser por Cowork (DEBUG-CT-4 cross-tab) | ✅ Tab 2 counter 27 → 28 + tabla refrescó + 0 errores en consola |

### Aprendizajes transferibles

- **Endurecimiento de contrato vence al tag-and-fix manual**: el tipo del callback (`refetch: () => void`) era demasiado permisivo. Sin separar `refetchItems` de `refetchStats`, cualquier facade futuro con stats podría volver a caer en la asimetría sin que code review lo detecte. La firma estricta convierte el bug en error de compilación.

- **Logs temporales necesitan saltar gates de logger**: en proyectos con `logger` gateado por entorno (debug, dev mode, etc.), debugging puntual con la API normal de logger puede fallar silenciosamente. `console.log` directo con tag de chat (`[FEATURE-DEBUG]`) y comentario `// TEMP debug NNN` es la salida pragmática — siempre que se removan antes del commit (validable con `grep "TEMP debug" src/`).

- **SW en dev no es free**: registrar el SW también en `npm run start` da paridad con producción (bugs de cache aparecen en dev), pero el costo es que iterar código requiere unregister + clear caches periódicamente. Si el costo se hace insostenible, agregar guard `localhost && !production → no registrar` es el escape hatch documentado en `service-worker-scope.md`.

- **El SW de scope `/` que ves en DevTools y no sabés de dónde sale** suele ser residuo de versiones previas. Cuando se cambió el scope del SW (`/` → `/intranet/`) el viejo nunca se desregistra automáticamente — hay que limpiar manualmente cuando aparece. No es bug, es deuda histórica.

- **Multi-tab leader election + BroadcastChannel ya estaban probados**: el fix del 098 NO tocó esa capa. El bug era 100% en la capa de aplicación (qué hace cada facade al recibir el broadcast). Confirma que la separación leader/follower del `WalLeaderService` es robusta.
