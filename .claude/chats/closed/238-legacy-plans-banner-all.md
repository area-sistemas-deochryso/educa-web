# 238 — Add legacy banner to all pre-ADR-0006 repo-local plans

> **Origen**: `educa-coord` brief 236 · commit `2de5c19` · 2026-05-25.
> **Created**: 2026-05-25 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`

## Context

ADR-0006 establishes that plans must be contracts, not blueprints. Brief 236 added defensive legacy banners to all pre-ADR-0006 plans in `educa-coord/plans/`. This brief does the same for **repo-local plans** in `educa-web/.claude/plan/`.

The banner is a safety net: if a `/go` chat picks up a plan before it's rewritten to D1 format, the banner warns the LLM to extract intent + decisions only and ignore stale implementation detail.

## Scope

### educa-web

Add the following banner to every `.claude/plan/*.md` file (excluding `maestro.md`) that does NOT already have a D1 or legacy banner:

```markdown
> ⚠️ **Legacy plan (pre-ADR-0006).** This plan may contain implementation detail (file paths, DTOs, counts) that could be stale. Per [ADR-0006 D5](../../educa-coord/decisions/0006-plan-authoring-contract-not-blueprint.md), extract intent + decisions only — ignore concrete paths, signatures, and counts. Investigate current code before executing.
```

Place it immediately after the `# title` line (before any existing blockquotes or content).

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

- Read ADR-0006 D5 (legacy plan policy).

## Out of scope

- Rewriting plans to D1 format (that's brief 240).
- Modifying plan content beyond adding the banner.
- Updating `maestro.md`.

## Criterio de cierre

- [x] All 12 plans have the legacy banner.
- [x] No plan content was modified beyond the banner insertion.
- [x] `maestro.md` untouched.
