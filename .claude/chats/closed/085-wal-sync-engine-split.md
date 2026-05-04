# 085 — Split estructural de `wal-sync-engine.service.ts`

> **Repo**: educa-web (main) · **Tipo**: Refactor FE
> **Origen**: `tasks/wal-sync-engine-split.md` (deuda F3.5.B Plan 1, 2026-04-15)
> **Creado**: 2026-05-04 · **Estado**: ✅ cerrado · **Cierre**: 2026-05-04

## Objetivo

Cerrar deuda estructural: `wal-sync-engine.service.ts` vivía con `eslint-disable max-lines` justificado (303 ln efectivas / cap 300). Extraer responsabilidades cohesivas a helpers/services para volver al límite **sin** colapsar comentarios.

## Decisiones de diseño tomadas

1. **Recovery service stateless** — `WalSyncRecovery.run(): WalRecoveryResult`. Devuelve `{ migrationEntries }` y NO emite al `_entryProcessed$` del engine ni invoca `processAllPending` directamente. El engine orquesta los efectos sobre su propio subject. Contrato chico, fácilmente testeable.
2. **Classifier puro convive con utils existentes** — `classifyWalError(error): WalErrorClassification` se agregó en `wal-error.utils.ts` y reusa internamente `isConflictError`/`isPermanentError`/`extractErrorMessage`. El engine pasa de 3 ifs encadenados a 1 switch sobre discriminated union (`'conflict' | 'permanent' | 'retryable'`).
3. **Hallazgo que pisó la propuesta inicial de la task** — la task original sugería extraer "Error Handling" como helper puro stateless. Diagnóstico real: `wal-error.utils.ts` ya extraía las funciones puras de **clasificación**; lo que vivía en `handleError` era **orquestación de efectos** (markConflict, invalidateForEntry, callbacks, emit). Un "helper puro" para Error Handling habría requerido pasar 4 dependencias del engine y habría sido un mini-engine disfrazado. Por eso la decisión final fue **A + classifier puro chico** en vez de extraer Error Handling completo.
4. **Recovery elegida como extracción principal** porque es flujo de borde (corre una vez al boot, no toca el hot loop FIFO/leader guard) — riesgo bajo de romper invariantes del engine.
5. **NO se exporta `WalSyncRecovery` ni `classifyWalError` desde el barrel** — el barrel marca explícitamente que SyncEngine y dependencias internas son implementation detail. Coherencia con el comentario existente.

## Métricas

| Métrica | Antes | Después | Delta |
|---|---:|---:|---:|
| Engine — líneas físicas | 467 | 418 | -49 |
| Engine — líneas efectivas (ESLint max-lines) | 303 | **274** | **-29** |
| Engine — escape hatch `eslint-disable max-lines` | sí | no | ✅ removido |
| Margen al cap (300) | -3 (sobre cap, justificado) | +26 | +29 |

## Archivos tocados

| Archivo | Acción | Detalle |
|---|---|---|
| `src/app/core/services/wal/wal-sync-recovery.service.ts` | **NEW** | Service `WalSyncRecovery` con `run(): Promise<WalRecoveryResult>` |
| `src/app/core/services/wal/wal-sync-recovery.service.spec.ts` | **NEW** | 6 tests (purga, queries paralelas, sin migraciones, con migraciones, fail-safe, error en getMigrationEntries) |
| `src/app/core/services/wal/wal-error.utils.ts` | mod | + `WalErrorClassification` type + `classifyWalError()` |
| `src/app/core/services/wal/wal-error.utils.spec.ts` | **NEW** | 8 tests del classifier (409 / 4xx incl. 429 / 401 / 408 / 5xx / network / no-HTTP) |
| `src/app/core/services/wal/wal-sync-engine.service.ts` | mod | -1 escape hatch · -region Recovery · -3 imports redundantes · -`RESOURCE_TYPES_TO_PURGE` static · `init()` consume `recovery.run()` · `handleError` usa switch sobre `classifyWalError` |

## Validación

- `npx eslint src/app/core/services/wal/` → ✅ limpio
- `npx tsc --noEmit -p tsconfig.json` → ✅ exit 0
- `npx vitest run src/app/core/services/wal/` → ✅ **34/34** (3 archivos)
- `npx vitest run` (suite full) → ✅ **1798/1798** (+14 sobre baseline 1784)

## Criterios de éxito

- [x] `wal-sync-engine.service.ts` sin `eslint-disable max-lines`
- [x] `eslint src/app/core/services/wal/` limpio
- [x] Specs existentes verdes (`wal-facade-helper.service.spec.ts` 20/20)
- [x] ≥1 spec nuevo para código extraído (recovery 6 + classifier 8)
- [x] Plan maestro actualizado (DS1 ✅)
- [x] Task `tasks/wal-sync-engine-split.md` eliminada (deuda cerrada)

## Aprendizajes transferibles

1. **Antes de aceptar la propuesta inicial de un task viejo, diagnosticar el código real**. La task de 2026-04-15 sugería un split que el código de 2026-05-04 ya no necesitaba en esa forma — el subsystem evolucionó (`wal-error.utils.ts` ya tenía las funciones puras). Aplicar la propuesta literal habría sido un refactor cosmético.
2. **Distinguir "clasificación" de "orquestación de efectos"**. Cuando un bloque grande se siente "lógico para extraer pero acoplado", revisar si lo que se quiere extraer es la decisión (pura) o la aplicación de la decisión (con efectos). Casi siempre vale extraer la decisión y dejar la aplicación inline.
3. **Recovery / boot-time setup es naturalmente extraíble** del runtime processing. Los flujos que corren una vez al arranque rara vez comparten estado mutable con el hot loop — su contrato suele caber en un `run()` con resultado plain object que el caller consume.
4. **El "margen al cap" tras refactor importa**. Bajar de 303 a 274 efectivas (margen 26) deja espacio razonable. Bajar a 298 (margen 2) habría dejado el archivo en estado frágil — el primer cambio futuro reintroduciría el escape hatch.

## Referencias

- Task original: `tasks/wal-sync-engine-split.md` (eliminada al cerrar)
- Maestro: sección "Deuda estructural diferida" → DS1 marcado ✅
