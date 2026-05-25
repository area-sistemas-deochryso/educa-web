# Plan 47 — Limpieza de links rotos en `maestro.md`

> ✅ **Rewritten to ADR-0006 D1 format** (2026-05-25). Contract only — no implementation detail.

> **Repo**: `educa-web` (FE) · **Tipo**: chore(.claude) · **Riesgo**: bajo (solo docs)
> **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.

---

## Problem

`.claude/plan/maestro.md` has broken links pointing to plans/tasks that never existed or were eliminated. This breaks navigation and confuses the prioritized queue used by `/next-chat`, `/start-chat`, `/triage`.

---

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Classification | For each broken link: exists (false positive), archived (repoint to history), still valid but uncreated (mark `(pendiente crear)`), obsolete (remove) | Preserves valid references while cleaning dead ones |
| Scope | Only fix links, not narrative or plan status | Minimal-risk edit to a critical coordination document |

---

## Phases

### Phase 1 — Inventory and verification

For each broken ref in maestro.md, check if the target path exists, was archived to history, was never created but is still valid, or is obsolete.

### Phase 2 — Apply changes

Edit maestro.md: repoint archived refs to their history anchor, mark uncreated-but-valid with `(pendiente crear)`, remove obsolete lines.

---

## Done-when

- All markdown links in `maestro.md` point to existing files or valid history anchors.
- No dead links remain (verifiable via grep for `.md` refs and checking existence).

---

## Out of scope

- Changing plan status, priority, or narrative in maestro.md.
- Creating missing plans (only marking them as `pendiente crear`).
