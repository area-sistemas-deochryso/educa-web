# Plan 13 — Frontend: Test Gaps Críticos

> ✅ **Rewritten to ADR-0006 D1 format** (2026-05-25). Contract only — no implementation detail.

> **Fecha**: 2026-04-16
> **Objetivo**: Cubrir las áreas del frontend sin tests: páginas admin críticas, flujos de integración UI, interceptores nuevos, y resiliencia WAL/offline/cache.
> **Coordinación**: Complementa Plan 10 (Flujos Alternos) y Plan 1 F4 (Invariantes).

---

## Problem

El frontend tiene 129+ spec files con buena cobertura de stores/facades/guards, pero gaps significativos en: interceptores core (invisibles al fallar), páginas admin sin ningún spec, flujos de integración no validados end-to-end en FE, y resiliencia WAL/offline parcial.

---

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Test scope for interceptors | Behavior tests (unwrap, header handling, cache invalidation) | Interceptors are invisible — if they break, the whole app degrades without clear error |
| Admin page testing approach | Store + facade tests only (not template) | Sufficient to catch CRUD regressions without brittle DOM assertions |
| Integration test strategy | TestBed + real providers where possible | Validates the chain login→permisos→guard→navigation→data load as a unit |
| WAL test focus | Optimistic apply, server-fail rollback, offline queue, IndexedDB corruption fallback | WAL is the heart of optimistic UX — rollback failures show inconsistent data |
| Shared component test scope | High-use components (10+ pages) only | Regression in these impacts the whole app |

---

## Phases

### F1 — Interceptores Core (CRÍTICO) ✅

Cover all interceptors without specs: API response unwrap, clock sync, SW cache invalidation, request trace. Each interceptor gets a dedicated spec validating its behavior contract.

### F2 — Páginas Admin Críticas

One spec per critical admin page (asistencias, feedback-reports, health-permissions, email-outbox, error-logs) covering store + facade operations.

### F3 — Flujos de Integración UI

Integration tests for 4 critical chains: login flow, guard+permisos, CRUD admin pattern, error recovery. Validates end-to-end data flow within FE.

### F4 — WAL / Offline / Cache

Extend existing WAL specs to cover: optimistic update success/fail, create with server ID, offline queue, SWR cache stale refresh, IndexedDB corruption fallback.

### F5 — Componentes Shared de Alto Uso

Specs for high-use shared components (skeleton-loader, table-skeleton, stats-skeleton, lazy-content, intranet-layout) verifying render variants and responsive behavior.

**Ordering rationale**: F1 first (invisible base), F2 (admin CRUD unprotected), F4 (optimistic UX), F3+F5 (general robustness).

---

## Done-when

- All interceptors have behavior specs covering success, error, and edge-case paths.
- Every critical admin page has at least one spec covering its primary store+facade operations.
- Integration flow tests validate the 4 critical chains without regressions.
- WAL specs cover all 6 documented scenarios (apply-ok, apply-fail, create-with-id, offline-queue, SWR-stale, IndexedDB-corrupt).
- Shared high-use components have render-variant specs.
- Full test suite passes green with no regressions.

---

## Out of scope

- E2E tests (Playwright/Cypress) — separate plan.
- Backend test coverage.
- Template/DOM-level assertions for admin pages.
