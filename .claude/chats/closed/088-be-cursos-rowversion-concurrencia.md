# 088 · BE Cursos rowVersion no enforce concurrencia (409)

> **Validación prod**: ✅ verificada 2026-05-04 — verde: 2 tabs con rowVersion stale → 409 Conflict + WAL entry CONFLICT confirmado
> **Creado**: 2026-05-04 · **Estado**: ⏳ pendiente arrancar.
> **Repo**: `Educa.API` (master) · cross-repo desde educa-web.
> **Origen**: Caso 3 del WAL smoke (chat 087, commit `9c39d40`) quedó bloqueado por bug BE.
> **Task fuente**: [`tasks/wal-smoke-fail-3-be-no-rowversion-409.md`](../../tasks/wal-smoke-fail-3-be-no-rowversion-409.md)

## Síntoma

`PUT /api/sistema/cursos/{id}/actualizar` devuelve **200 OK** con `rowVersion`
explícitamente stale. Esperado: **409 Conflict**.

Repro one-liner desde consola (ver task) — un solo `fetch` con `rowVersion:'AAAAAAAAAQE='`
contra curso real ya basta; no requiere coreografía de 2 tabs.

## MODO SUGERIDO

`/investigate` (hipótesis ordenadas) → `/design` (decidir fix) → `/execute` → `/validate` (test de concurrencia).

## Hipótesis a validar (en orden)

| # | Hipótesis | Archivo a inspeccionar |
|---|-----------|------------------------|
| **a** | `_context.Set<T>().Update(entity)` re-trackea pisando `OriginalValue` del rowVersion | `Educa.API/Repositories/Common/BaseRepository.cs` (`UpdateAndSaveAsync`) |
| **b** | `CUR_RowVersion` sin `IsRowVersion()` / `IsConcurrencyToken()` | `Educa.API/Data/Configurations/.../CursoConfiguration.cs` |
| **c** | `DbUpdateConcurrencyException` no mapeado a 409 | `Educa.API/Middleware/GlobalExceptionMiddleware.cs` |

Hipótesis (a) y (b) pueden coexistir — si (b) falta, (a) ni siquiera importa porque
EF no incluye `CUR_RowVersion` en el WHERE del UPDATE.

## Criterios de cierre

1. PUT con rowVersion stale → **409 verificado por test automatizado** en `Educa.API.Tests`.
2. Curl/repro de la task confirma 409 contra entorno local.
3. **Awaiting-prod**: tras deploy a Azure, re-ejecutar **solo Caso 3** del WAL smoke
   (Cowork) y mover este brief a `closed/` con `/verify`.

## Scope explícito

- ✅ Fix del enforcement de concurrencia en cursos (mínimo).
- ✅ Si la causa raíz es transversal (hipótesis a o c), aplicar fix global y
  agregar grep / nota en `business-rules.md` o `backend.md` sobre el patrón correcto.
- ❌ NO migrar a otras entidades en este chat (deuda derivada → brief aparte si aplica).
- ❌ NO tocar el WAL del FE (ya validado en chat 087).

## Pre-work

- Leer task `wal-smoke-fail-3-be-no-rowversion-409.md` (fuente de hipótesis).
- Verificar memoria del proyecto sobre RowVersion:
  ([Model checklist backend](../../rules/backend.md#model-checklist-backend) — `[Timestamp]` + `[Column("XXX_RowVersion")]`).

## Aprendizajes transferibles esperados

- Patrón canónico de concurrency en `BaseRepository` + EF Core 9.
- Si se descubre que más entidades tienen el mismo bug, abrir task de barrido.

<!-- minimal-from-go -->
