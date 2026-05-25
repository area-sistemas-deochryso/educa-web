# Plan 1 — F5.3: Re-exports `@shared` → `@intranet-shared`

> ✅ **Rewritten to ADR-0006 D1 format** (2026-05-25). Contract only — no implementation detail.

> **Estado**: 🔄 en curso (2026-05-22)
> **Plan padre**: F1 Enforcement de Reglas
> **Principio**: "`@shared` solo contiene lo genuinamente compartido entre portal público e intranet."

---

## Problem

`@shared` re-exports pipes, directives, validators, utils, components, and services that are only consumed by the intranet feature. This pollutes the shared barrel, makes the boundary between public portal and intranet unclear, and violates the layering principle that `@shared` should only contain genuinely cross-cutting code.

---

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Migration target | `@intranet-shared` (existing alias for intranet-only shared code) | Already exists as the correct home for intranet-specific utilities |
| Batch strategy | 3 batches (pipes+directives+validators+utils → components → services+cleanup+ESLint) | Incremental, each batch independently validatable |
| Barrel cleanup | After each batch, remove migrated items from `@shared` barrel | Keeps the boundary clean progressively |
| ESLint prevention | Final batch adds rule preventing future `@shared` re-exports of intranet-only code | Closes the loop permanently |

---

## Phases

### Batch 1 — pipes + directives + validators + utils ✅

Migrate consumers of intranet-only pipes, directives, validators, and utils from `@shared` to `@intranet-shared`. Clean re-export shims from `@shared` barrel.

### Batch 2 — components re-exports

Migrate consumers of re-exported components from `@shared/components` to `@intranet-shared/components`. Leave genuinely shared components (skeleton, toast, devtools) in `@shared`.

### Batch 3 — services + cleanup + ESLint

Evaluate services 1×1. Reduce `@shared` barrel to genuinely shared items only. Add ESLint rule preventing future re-exports of intranet-only code from `@shared`.

---

## Done-when

- `@shared` barrel only exports code genuinely used by both portal público and intranet.
- All intranet-only utilities live under `@intranet-shared`.
- ESLint rule prevents regression.
- Lint, build, and test suite pass after each batch.

---

## Out of scope

- Refactoring the internals of migrated code.
- Moving code between `@core` and `@shared` (different concern).
