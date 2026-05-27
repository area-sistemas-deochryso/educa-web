# 250 — FE: consume error trace backend (B7 PR4)

> **Created**: 2026-05-27 · **Closed**: 2026-05-27 · **State**: ✅ closed (redundant).
> **Origin**: `educa-coord/pending-xrepo/sync-maestros-235` — BE shipped PRs 1-3 (error trace observability), FE consumption pending.
> **MODO SUGERIDO**: `/investigate`
> **Resolution**: Subsumed by **P45 F2.2** — no independent FE work.

## Context

B7 (Error Trace Backend) shipped PRs 1-3 in BE (2026-05-12, retro-validated 2026-05-18). PR4 is the FE-side consumption of the error trace data. This may overlap with P41 (Correlation Hub) or P45 (Monitoreo incidencias) — investigate whether the work is already subsumed before executing.

## Scope

- Investigate what error trace data BE now exposes that FE doesn't consume yet.
- Determine overlap with P41/P45 — if fully subsumed, close this brief with a note.
- If there's independent FE work, design and execute.

## Done-when

- FE consumes all error trace endpoints that B7 exposed, OR this brief is closed as subsumed by P41/P45 with explicit justification.

## Resolution (2026-05-27)

**Closed as redundant — subsumed by P45 F2.2.**

B7 PR3 exposed `ErrorLogTraceDto` (execution trace by layer: CONTROLLER/SERVICE/REPOSITORY/SQL/EXTERNAL) within `GET /api/sistema/errors/{id}`. FE already has the full error tracking pipeline (error groups kanban, correlation hub timeline, breadcrumbs, feedback integration) but does **not yet render the trace table**.

P45 F2.2 (`⏳ siguiente`) has this exact scope: JOIN `/full` endpoint + event-level view + **Trace table** rendering. No independent FE work exists outside that plan.
