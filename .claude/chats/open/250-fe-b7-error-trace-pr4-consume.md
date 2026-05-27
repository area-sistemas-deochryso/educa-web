# 250 — FE: consume error trace backend (B7 PR4)

> **Created**: 2026-05-27 · **State**: ⏳ pending start.
> **Origin**: `educa-coord/pending-xrepo/sync-maestros-235` — BE shipped PRs 1-3 (error trace observability), FE consumption pending.
> **MODO SUGERIDO**: `/investigate`

## Context

B7 (Error Trace Backend) shipped PRs 1-3 in BE (2026-05-12, retro-validated 2026-05-18). PR4 is the FE-side consumption of the error trace data. This may overlap with P41 (Correlation Hub) or P45 (Monitoreo incidencias) — investigate whether the work is already subsumed before executing.

## Scope

- Investigate what error trace data BE now exposes that FE doesn't consume yet.
- Determine overlap with P41/P45 — if fully subsumed, close this brief with a note.
- If there's independent FE work, design and execute.

## Done-when

- FE consumes all error trace endpoints that B7 exposed, OR this brief is closed as subsumed by P41/P45 with explicit justification.
