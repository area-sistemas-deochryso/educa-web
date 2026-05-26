# 219 — Add legacy banner to pre-ADR-0006 local plans

> **Created**: 2026-05-25 · **Closed**: 2026-05-26 · **Status**: ✅ already done.
> **Resolution**: All 12 local plans were already bannered in commits `ffbe9ae5` and `e604f9d1` (2026-05-25). No changes needed.
> **MODO SUGERIDO**: `/execute`
> **Origin**: `educa-coord` brief 236 — coord plans already bannered, this delegates the same treatment to local plans.
> **exclusive**: `false`
> **touches**:
>   - `educa-web`: `.claude/plan/*.md`

## Context

ADR-0006 D5 (lives in `educa-coord/decisions/0006-plan-authoring-contract-not-blueprint.md`) says legacy plans are not rewritten, but the LLM follows their concrete instructions literally when `/go` reads them. A prominent banner at the top is the minimum viable fix.

Coord already bannered its 17 `plans/xrepo-*.md` files. This repo has its own local plans in `.claude/plan/` that predate ADR-0006 and may contain stale implementation detail (file paths, component names, line counts, DTOs).

## Scope

1. **Investigate** each `.md` file in `.claude/plan/` (excluding `maestro.md`).
2. For each file that contains implementation detail (file paths, component names, line counts, signatures, pseudocode), add this banner **after the H1 title and before any existing content**:

```markdown
> ⚠️ **Legacy plan (pre-ADR-0006).** This plan contains implementation detail (file paths, components, counts) that may be stale. Per ADR-0006 D5, extract intent + decisions only — ignore concrete paths, signatures, and counts. Investigate current code before executing.
```

3. If a plan is already pure contract format (intent + decisions, no concrete paths/signatures), **skip it**.

## Pre-work

- Skim each plan's first ~10 lines to classify as legacy vs contract.

## Out of scope

- Rewriting any plan content.
- Touching `maestro.md`.
- Updating coord plans (already done in brief 236).

## Criterio de cierre

- [ ] Every local legacy plan has the banner after H1.
- [ ] No contract-format plan was bannered.
- [ ] `git diff --stat` shows only `.claude/plan/*.md` files changed.

## Tiempo estimado

~10 min.
