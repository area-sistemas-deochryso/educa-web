# 213 — Audit: cohesion & coupling in educa-web

> **Repos afectados**: `educa-web`
> **Plan**: none (standalone audit, companion to brief 212)
> **Creado**: 2026-05-21 · **Estado**: ✅ completado 2026-05-21. Reporte en `educa-coord/audits/213-fe-cohesion-coupling.md`.
> **MODO SUGERIDO**: `/audit`
> **exclusive**: `false`
> **touches**:
>   - `educa-web`: `src/app/core/`, `src/app/data/`, `src/app/shared/`, `src/app/features/`

## Scope

Read-only audit of educa-web's internal architecture measuring 4 dimensions (same framework as brief 212 for Educa.API, adapted to Angular/frontend):

### D1 — Cross-layer coupling

Map actual import graph between layers: `core/` ↔ `data/` ↔ `shared/` ↔ `features/`. Detect illegal or unexpected directions (feature importing another feature's internals, shared depending on features, core depending on features, etc.). Path aliases (`@core`, `@shared`, `@data`, `@features`, `@intranet-shared`) make this greppable.

### D2 — Cross-module cohesion

For each domain area (attendance, grades, schedule, messaging, etc.): is everything it needs colocated, or scattered across `core/services/`, `data/models/`, `shared/components/`, and `features/intranet/`? Known smell to investigate: `core/services/` has 26 services — which ones are truly cross-cutting (auth, session, http) vs. domain-specific services that migrated to core?

### D3 — Dependency inversion

Do components depend on concrete services or abstractions? Is the data layer (adapters, models) independent of UI concerns? Do stores depend on services or the reverse? Check the direction: component → store → service → HTTP, or is it tangled?

### D4 — Enforcement

Unlike the API (single .csproj), educa-web has path aliases and barrel files. Assess: do barrel files actually restrict what's exported, or do they re-export everything? Are there ESLint rules enforcing layer boundaries? Does `@intranet-shared` leak into `@shared` or `@core`?

## Methodology

Grep-based analysis of import statements across layers:
- `from '@core'` / `from '@shared'` / `from '@data'` / `from '@features'` patterns
- Direct path imports that bypass barrel files
- Cross-feature imports (feature A importing from feature B)
- Services in core/ that reference domain-specific models

Classify by severity (same scale as brief 212):
- **Critical**: dependency going wrong direction (shared → feature, core → feature)
- **High**: domain service misplaced in core when it belongs in feature
- **Medium**: cross-module coupling within same layer, barrel file bypass
- **Low**: convention weakness without current violation

## Pre-work

- Read `tsconfig.json` path aliases to confirm layer boundaries.
- Check for ESLint/nx boundary rules if any exist.

## Out of scope

- Refactoring. Findings only.
- Educa.API. Covered by brief 212.
- Performance, bundle size, or test coverage audits.
- Component-level UI review.

## Deliverable

Report in `educa-coord/audits/213-fe-cohesion-coupling.md` with:
- Import dependency graph (text-based) showing actual layer relationships
- Findings table per dimension (severity, location, description)
- Cohesion rating per domain area (is it colocated or scattered?)
- Comparison notes with brief 212 findings (shared patterns, shared problems)
- Prioritized list of highest-leverage refactor targets

## Criterio de cierre

- [ ] All 4 dimensions measured with evidence (file:line references)
- [ ] Findings report written to `educa-coord/audits/`
- [ ] No code modified

## Tiempo estimado

~45 min.
