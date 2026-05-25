# Plan de Consolidación Frontend

> ✅ **Rewritten to ADR-0006 D1 format** (2026-05-25). Contract only — no implementation detail.

> **Fecha**: 2026-04-13
> **Objetivo**: Elevar el frontend al nivel de solidez del backend.
> **Principio rector**: "Reducir la distancia entre lo declarado y lo real."
> **Horizonte**: 3-6 meses, trabajo incremental.
> **Coordinación cross-plan**: Plan xrepo asignación-profesor-salon-curso Fase 4 usa `SchedulesOptionsStore` (introducido en F2 de este plan).

---

## Problem

El frontend tiene buena cobertura de patrones (49 facades, 41 stores, 94 services) pero calidad superficial en tests, archivos que exceden la regla max-lines:300 (15+ en TS, 10+ en templates), y disonancia entre reglas documentadas y código real.

---

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Test focus | Behavior tests of critical data flows, not superficial creation assertions | Detects real regressions in facade→store→vm chains |
| File split criterion | Features MUST be <350 ln; Core/infra gets documented escape hatch if cohesive | Features accumulate responsibilities over time; infra is intentionally cohesive |
| Template split approach | Extract presentational sub-components (stats, filters, table, dialog) | Follows existing pattern; each sub-component is OnPush with input/output |
| Compliance enforcement | Audit-then-fix with trackable TODOs; incremental correction on touch | Pragmatic: full sweep is too costly, but new violations are blocked |
| WAL test pattern | Controllable WAL mock (execute captures config, exposes commit/fail) | Replicable across all facade specs; validates optimistic UX behavior |

---

## Phases

### Fase 1 — Tests de Comportamiento ✅

5/5 critical flows covered: CRUD usuarios (18+25 tests), login/session/permisos (11 tests), asistencia director (18 tests), horarios admin (16 tests), WAL optimistic (covered within CRUD).

### Fase 2 — Dividir Archivos TS Grandes (parcial ✅)

6/10 files completed. Remaining Grupo B (4 files): campus-admin.store, salones-admin.facade, error-reporter.service, preferences-storage.service, session-storage.service. Grupo A files have documented escape hatches.

**Ordering rationale**: by edit frequency (higher churn = higher regression risk).

### Fase 3 — Dividir Templates Grandes

Top 5 templates (>400 ln each) need extraction of presentational sub-components. Remaining templates split incrementally when touched.

### Fase 4 — Compliance Reglas vs Código

Audit 7 rule categories (table transparency, filter transparency, appendTo, dialogs outside @if, [(visible)] two-way, buttons without aria-label, functions in template). Critical violations fixed immediately; medium documented as TODOs.

### Fase 5 — Enforcement Fases 3-5

Continue enforcement-reglas.md: semantic types remaining, CI verification of branch protection, barrel exports restrictivos (now separate plan: F5.3 re-exports).

### Fase 6 — Tests Pre-Matrícula

Safety net before implementing the most complex roadmap feature: salones admin CRUD, aprobación masiva, estudiante-salon assignment (INV-U01).

---

## Done-when

- All 5 critical flow behavior tests pass (✅ done).
- No feature TS file >350 ln (infra with documented escape hatch OK).
- Top 5 templates split into sub-components; no new template >250 ln.
- Compliance audit executed for 7 rules; critical violations corrected.
- Barrel exports hardened for storage/wal/session zones (see F5 wrappers plan).
- Pre-matrícula test red de seguridad in place for salones, aprobación, estudiante-salon.

---

## Out of scope

- Backend consolidation (separate plan in Educa.API).
- E2E tests (separate plan).
- New features or UI redesign.
