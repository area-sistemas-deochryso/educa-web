# Plan: WAL optimistic — academic module audit fixes

> **Created**: 2026-05-28
> **Origin**: `educa-coord/pending-xrepo/fe-audit-wal-optimistic-academico.md`
> **Status**: ready
> **Scope**: 2 facades, 3 mutations total

## Problem

Audit of 14 academic pages (estudiante + profesor) found 2 facades with mutations
that block the UI via direct `.subscribe()`, violating `optimistic-ui.md` and
ESLint rule `wal/no-direct-mutation-subscribe`.

## Targets

### F1 — Attendance by course (profesor)

- Facade: attendance-course
- Mutation: `registrar()` (POST — marks students P/T/F for a session)
- Current: direct `.subscribe()`, no WAL
- Fix: `wal.execute()` with optimistic apply + deterministic rollback
- Consistency level: `optimistic` (default) — INV-AC03 (period closed) is server-validated;
  rollback safe. No INV-* of irreversibility applies.
- Cross-tab refetch: subscribe to `WalCrossTabRefetchService` for the resource type
- Risk: verify if `registrar()` sends a batch payload (multiple students at once);
  optimistic apply/rollback must patch all items

### F2 — Health permissions (profesor/classrooms)

- Facade: health-permissions
- Mutations: `anularPermisoSalida()`, `anularJustificacion()` (both DELETE-like)
- Current: direct `.subscribe()` — asymmetric because `crear*` already uses WAL
- Fix: convert both to `wal.execute()` with optimistic apply + deterministic rollback
- Consistency level: `optimistic` (default) — no INV-* applies
- Cross-tab refetch: facade already injects WAL for creates; verify existing subscription
  covers annulation resource type
- Risk: low — single-record operations, pattern already proven in same facade's `crear*`

## Execution notes

- F1 and F2 are independent (different feature directories, no shared state)
- Scope is small enough for a single chat
- After fixing, run `ng build` + ESLint to confirm no violations remain

## Out of scope

- `profesor-final-salones.facade.ts` — intentional bypass justified by INV-T02 (irreversible approval)
- `profesor.facade.ts:saveNotaSalon()` — needs separate trace to determine consumer page
- Student uploads (cursos) — show interactive loading, not UI freeze; acceptable per Level A criteria
- Read-only pages (9 of 14) — no mutations, no risk
- Level B/C improvements — go to normal queue

## Done-when

- No direct `.subscribe()` on mutations in either facade
- ESLint `wal/no-direct-mutation-subscribe` passes clean
- Both use `wal.execute()` with optimistic apply + deterministic rollback
- Cross-tab refetch subscribed for attendance-course resource type
- `ng build` and existing tests pass
