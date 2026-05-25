# 240 — Rewrite repo-local legacy plans to ADR-0006 D1 contract format

> **Origen**: `educa-coord` chat 237 · commit `e92ce54` · 2026-05-25.
> **Created**: 2026-05-25 · **Estado**: ✅ completado 2026-05-25.
> **MODO SUGERIDO**: `/execute`
> **sequence**: After brief 238 (banners must exist before rewrite begins — if a rewrite is interrupted mid-way, unbannered plans are still dangerous).

## Context

Brief 238 adds a defensive banner to all repo-local plans. But banners are a bandaid — the LLM still reads pages of stale detail and must actively resist following it. The real fix is converting plans to contract format per ADR-0006 D1: intent + decisions + functional phases, no file paths, no DTOs, no pseudocode, no counts.

## Scope

### educa-web

Audit all `.claude/plan/*.md` files (excluding `maestro.md`) and rewrite those that contain implementation detail to D1 format.

For each plan:

1. **Assess**: does the plan contain file paths, DTO signatures, pseudocode, exact counts, or hour estimates? If not (already clean or purely a checklist), skip with a note.
2. **Extract** intent (problem + why it matters) and decisions (choice + why, as `Decision | Choice | Why` table).
3. **Convert** phases from implementation steps to functional descriptions (what each achieves + ordering rationale).
4. **Preserve** done-when criteria, converting file-level checks to observable outcomes.
5. **Remove** file paths, DTO/interface signatures, pseudocode, exact counts, hour estimates.
6. **Keep** technology choices and architectural observations that ARE the decision (grey zone per D1).
7. **Preserve** phase completion status — phases already marked ✅ keep their status.

**After rewrite**, replace legacy banner with:

```markdown
> ✅ **Rewritten to ADR-0006 D1 format** (YYYY-MM-DD). Contract only — no implementation detail.
```

Plans that are already clean or purely operational checklists (no implementation detail to remove) replace with:

```markdown
> ℹ️ **Reviewed for ADR-0006 D1 compliance** (YYYY-MM-DD). No rewrite needed — already contract-level.
```

**Known plan files** (12, excluding maestro):

- `test-frontend-gaps.md`
- `asistencia-home-widgets.md`
- `monitoreo-redesign.md`
- `monitoreo-pages-redesign.md`
- `enforcement-fase-5-wrappers.md`
- `maestro-links-cleanup.md`
- `appendto-barrido.md`
- `consolidacion-frontend.md`
- `drift-doc-cleanup.md`
- `migracion-arquitectura-claude.md`
- `intranet-fe-polish-W21.md`
- `enforcement-f5.3-re-exports.md`

## Pre-work

- Read ADR-0006 D1 rules (in `educa-coord/decisions/0006-plan-authoring-contract-not-blueprint.md`).
- Brief 238 must be completed first (sequence dependency).
- Read each plan fully before deciding whether it needs rewrite.

## Out of scope

- Updating `maestro.md` (rewrite doesn't change plan status or priority).
- Changing any plan's scope, decisions, or phase structure — only FORMAT changes.
- Creating new plans or closing existing ones.
- Rewriting cross-repo plans (those live in `educa-coord/plans/` and are already done).

## Criterio de cierre

- [ ] All 12 plans assessed: either rewritten to D1 or marked as compliant.
- [ ] No file paths, DTOs, pseudocode, counts, or hour estimates remain in rewritten plans.
- [ ] Phase completion status preserved accurately.
- [ ] Each plan has the appropriate banner (rewritten or reviewed).
