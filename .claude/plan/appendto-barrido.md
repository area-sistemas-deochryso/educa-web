# Plan 48 — Barrido `appendTo="body"` en `p-select`

> ✅ **Rewritten to ADR-0006 D1 format** (2026-05-25). Contract only — no implementation detail.

> **Repo**: `educa-web` (FE) · **Tipo**: chore(ui) · **Riesgo**: bajo
> **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.

---

## Problem

The rule `primeng.md` requires all `p-select`, `p-multiselect`, `p-dropdown`, and `p-calendar` to have `appendTo="body"` to avoid z-index/overflow issues inside dialogs or containers with `overflow: hidden`. An audit confirmed remaining instances without the attribute.

---

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Fix approach | Add `appendTo="body"` to all instances missing it | Trivial, mechanical fix aligned with existing rule |
| Exception handling | If `appendTo="body"` breaks a specific layout, document inline with comment | Rare case; preserves intent while noting the exception |

---

## Phases

### Phase 1 — Inventory

List all template files with `p-select`/`p-multiselect`/`p-dropdown`/`p-calendar` that lack `appendTo`.

### Phase 2 — Apply fix

Add `appendTo="body"` to each instance. Trivial edits.

### Phase 3 — Verify

Re-grep to confirm 0 remaining instances. Lint passes.

---

## Done-when

- Zero instances of `p-select`/`p-multiselect`/`p-dropdown`/`p-calendar` without `appendTo="body"` (excluding documented exceptions).
- Lint passes.

---

## Out of scope

- Other PrimeNG compliance issues (covered by separate plans/tasks).
