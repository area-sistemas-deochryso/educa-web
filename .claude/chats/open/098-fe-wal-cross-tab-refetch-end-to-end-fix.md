# 098 · FE · WAL cross-tab refetch — end-to-end no actualiza Tab B (fix de 091)

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
