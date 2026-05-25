# Plan 1 — F5.3: Re-exports `@shared` → `@intranet-shared`

> ⚠️ **Legacy plan (pre-ADR-0006).** This plan may contain implementation detail (file paths, DTOs, counts) that could be stale. Per [ADR-0006 D5](../../educa-coord/decisions/0006-plan-authoring-contract-not-blueprint.md), extract intent + decisions only — ignore concrete paths, signatures, and counts. Investigate current code before executing.

> **Estado**: 🔄 en curso (2026-05-22)
> **Plan padre**: F1 Enforcement de Reglas
> **Scope total**: ~107 archivos en 3 batches
> **Principio**: "`@shared` solo contiene lo genuinamente compartido entre portal público e intranet."

---

## Batches

### Batch 1 — pipes + directives + validators + utils (este chat)

| Categoría | Archivos consumidores | Acción |
|---|---|---|
| pipes | 21 | Cambiar `@shared/pipes` → `@intranet-shared/pipes`. Limpiar re-exports. Dejar `full-name` nativo. |
| directives | 1 | Cambiar `@shared/directives` → `@intranet-shared/directives`. Limpiar re-exports. |
| validators | 2 | `git mv` archivos a `@intranet-shared/validators/`. Actualizar imports. |
| utils | 2 | `git mv` archivos a `@intranet-shared/utils/`. Actualizar imports. |

### Batch 2 — components re-exports (chat futuro)

Migrar consumidores de los 7 componentes re-exportados desde `@shared/components` → `@intranet-shared/components`. Dejar componentes nativos (sections, toast, skeleton, devtools).

### Batch 3 — services + cleanup + ESLint (chat futuro)

Evaluar services 1x1 (38 intranet, 1 core). Reducir barrel `@shared`. Agregar ESLint rule preventiva.

---

## Checklist Batch 1

```
[ ] Pipes: 21 consumers migrados
[ ] Pipes: re-export shim limpiado (solo `full-name` queda en @shared/pipes)
[ ] Pipes: barrel @shared/index.ts actualizado (no re-exporta pipes de intranet)
[ ] Directives: 1 consumer migrado
[ ] Directives: re-export shim eliminado (directives sale del barrel @shared)
[ ] Validators: archivos movidos a @intranet-shared/validators/
[ ] Validators: 2 consumers actualizados
[ ] Utils: archivos movidos a @intranet-shared/utils/
[ ] Utils: 2 consumers actualizados
[ ] @intranet-shared/index.ts actualizado si hace falta (validators, utils)
[ ] npm run lint ✅
[ ] ng build --configuration production ✅
[ ] npx vitest run ✅
```
