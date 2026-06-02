# 288 — P45 F2.2 FE: Event view + Trace JOIN

> **Created**: 2026-06-02
> **Plan**: [xrepo-45](../../../../../educa-coord/plans/xrepo-45-monitoreo-incidencias-rework.md) §F2
> **Phase**: F2.2 FE — UI rework part 2/2
> **Repo**: educa-web
> **Predecessor**: brief 197 (F2.1 ✅ — occurrence drawer tabs shipped)
> **Depends on**: brief 290 (P45 F2.2 BE — endpoint `/error-logs/{id}/full`)
> **Mode**: `/execute` → `/validate`

---

## Objective

Complete the incident detail rework started in F2.1. Two FE deliverables (BE endpoint delivered by brief 290):

### 1. FE: Trace tab — populate with real data

Fill the Trace tab (currently empty state from F2.1) with `ErrorLogTrace[]` from the full endpoint. Show step list ordered by timestamp with layer, component, method, duration, and error snippet. Add FE↔BE JOIN by `CorrelationId` — show the counterpart entry (FE error that triggered the BE error, or vice versa) as a linked block within the tab.

### 3. FE: Event-level view toggle

Add a view toggle in `ErrorGroupsViewToggle` (currently group-only) to switch between:
- **By group** (existing): `ErrorGroup[]` with Kanban/table
- **By event** (new): `ErrorLog[]` individual rows with filters (date range, severity, user, HTTP status)

The event view lists individual log entries. Clicking one opens the occurrence drawer (already reworked in F2.1).

---

## Pre-work

- Read brief 197 closed to understand exactly what F2.1 shipped and component structure
- Read current `error-occurrence-drawer` component to see the empty-state tabs
- Read `ErrorGroupsViewToggle` component for the view switch integration point
- Verify brief 290 BE endpoint is deployed/available

## Dependencies

- F2.1 ✅ (occurrence drawer tabs — shipped)
- **Brief 290 BE** (endpoint `/error-logs/{id}/full`) — must be deployed first
- F5 BE (ProblemDetails) — NOT a dependency for F2.2. F2.2 surfaces existing data; F3 depends on F5.

## Validation

- `npm run lint` clean
- `npx tsc --noEmit -p tsconfig.app.json` clean
- Browser test: open `/intranet/admin/monitoreo/incidencias/errores`, switch to event view, click an event, verify Trace tab shows real data with FE↔BE correlation link

## Parallel

Can run simultaneously with P56 F1 (brief 287) — different module (monitoreo vs académico), no file overlap.
