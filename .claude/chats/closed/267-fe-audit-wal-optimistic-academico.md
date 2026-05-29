# 267 · FE — Audit WAL + optimistic state: módulo académico (estudiante + profesor)

> **Created**: 2026-05-29 · **Repo**: `educa-web` (main)
> **Mode**: `/investigate` → `/design` short → `/execute` → `/validate`
> **Origin**: pilot session 2026-05-29. Handoff from `educa-coord/pending-xrepo/fe-audit-wal-optimistic-academico.md`.
> **Urgency**: 🔴 HIGH — academic module pages in active use within days. Current UX: mutations block UI synchronously (5s+ perceived time on some actions).

## Problem

Horarios page (`/intranet/admin/horarios`) exposed a pattern: POST/PUT/DELETE mutations block the UI synchronously instead of using optimistic state + WAL. The user verified that sistema, comunicación, seguimiento, and inicio modules do NOT have this problem. The uncertainty is in the **academic module** — student and professor zones.

## Scope — 14 pages to audit

### Estudiante (prefix: `/intranet/estudiante/`)

| # | Route | Page |
|---|---|---|
| 1 | `asistencia` | Asistencia estudiante |
| 2 | `cursos` | Cursos estudiante |
| 3 | `foro` | Foro estudiante |
| 4 | `horarios` | Horarios estudiante |
| 5 | `mensajeria` | Mensajería estudiante |
| 6 | `salones` | Salones estudiante |

### Profesor (prefix: `/intranet/profesor/`)

| # | Route | Page |
|---|---|---|
| 7 | `asistencia` | Asistencia profesor |
| 8 | `calificaciones` | Calificaciones profesor |
| 9 | `cursos` | Cursos profesor |
| 10 | `final-salones` | Final salones profesor |
| 11 | `foro` | Foro profesor |
| 12 | `horarios` | Horarios profesor |
| 13 | `mensajeria` | Mensajería profesor |
| 14 | `salones` | Salones profesor |

## How to map code paths

Read menu config files at:
`src/app/features/shared/components/layout/intranet-layout/components/`

Look for menu definitions (estudiante-menu, profesor-menu or similar) to map each route → actual component path.

## Audit criteria (Level A only — blocking UI)

For each page, test every mutation (POST/PUT/DELETE):

| Check | Pass | Fail |
|---|---|---|
| UI responds immediately after click | ✅ optimistic | ❌ **Level A — fix** |
| Button/form shows loading but UI stays interactive | ✅ acceptable | — |
| UI freezes until response arrives | — | ❌ **Level A — fix** |
| Error rollback works if mutation fails | ✅ | ⚠️ note but not blocking |

**Not in scope**: Level B (could be faster) or Level C (doesn't need WAL). Only find pages where the UI **blocks** on mutations.

## Execution plan

### Phase 1: Map + audit
1. Read menu configs → map routes to component files
2. For each page, grep for mutation calls (POST/PUT/DELETE, service calls with `.subscribe()` or similar)
3. Check if those mutations use WAL facade or direct HTTP calls
4. Classify: uses WAL (✅), doesn't use WAL but doesn't block (⚠️ skip), blocks UI (❌ Level A)

### Phase 2: Fix Level A pages
- For each Level A page, add WAL optimistic pattern
- Scope per page: ~15-30 min depending on mutation count
- Can be done incrementally — one page per chat if needed

## Pre-work

- Read WAL infrastructure: `src/app/core/services/wal/` — understand the optimistic update pattern
- Check how sistema/comunicación modules use it (reference implementation)
- Read the specific service files for each page to find mutation methods

## Out of scope

- Admin module pages (`/intranet/admin/*`) — verified OK
- Sistema, comunicación, seguimiento, inicio — verified OK
- Level B/C improvements — go to normal queue
- New WAL infrastructure — assume existing WAL is sufficient
- Brief 119 scope (DELETE soft/hard mismatch) — closed as opportunistic, but if found during this audit, fix inline

## Related work

- P43, P45, P41 — different modules, unaffected
- P50 (FE cohesion refactor) — audit findings might feed into F2 violations list
- Brief 119 (closed) — partial overlap on DELETE optimistic patterns
