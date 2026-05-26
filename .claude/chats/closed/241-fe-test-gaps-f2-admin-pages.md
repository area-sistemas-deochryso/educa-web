# Chat 241 · FE · F13 F2 — Test Gaps: Páginas Admin Críticas

> **Creado**: 2026-05-26 · **Cerrado**: 2026-05-26 · **Estado**: ✅ closed
> **Plan**: [plan/test-frontend-gaps.md](../../plan/test-frontend-gaps.md) — F2
> **Modo**: /investigate → /execute → /validate

## Scope

One spec per critical admin page covering store + facade operations. Pages:
- asistencias (admin) — already had 2 specs (store + data facade)
- feedback-reports — **NEW: store + facade specs**
- health-permissions — **NEW: store + facade specs**
- email-outbox — already had 7 specs
- error-groups — already had 2 specs (store + crud facade)

Focus: the 2 pages with zero test coverage (feedback-reports, health-permissions).

## Decisions (from plan)

- Store + facade tests only (not template)
- Sufficient to catch CRUD regressions without brittle DOM assertions

## Result

4 spec files, 60 tests:
- `feedback-reports.store.spec.ts` — 11 tests (items, filters, drawer, mutations, vm)
- `feedback-reports.facade.spec.ts` — 18 tests (loadAll, loadItems, filters, detalle, cambiarEstado WAL, deleteReporte)
- `admin-health-permissions.store.spec.ts` — 15 tests (salones, permisos, justificaciones, estudiantes, dialogs, computed, vm)
- `admin-health-permissions.facade.spec.ts` — 16 tests (loadSalones, loadResumen, WAL create, anular, UI helpers)

Validation: tsc clean, 60/60 vitest green.

## Drift detected (not fixed — see meta-refresh)

- F1 F5.3 (pos 1): all 3 batches done, maestro still lists as pending
- H7 WAL naming (pos 5): brief 124 in closed/, maestro still lists as pending
- Notas operativas stale (references brief 218 in running/)
- P10 (pos 4): FE maestro says "libre" but coord maestro says "🔒 bloqueado"

## Criterios de cierre

- [x] 1 spec file per admin page (5/5 pages now have specs)
- [x] Tests verify store + facade CRUD operations
- [x] Suite verde: tsc + vitest
