# 289 — P41 F1 (FE): Unified chronological timeline in correlation hub

> **Created**: 2026-06-02
> **Plan**: [xrepo-41](../../../../../educa-coord/plans/xrepo-41-correlation-hub-observability.md) §F1
> **Phase**: F1 — Unified chronological timeline
> **Repo**: educa-web (FE-only, no backend changes)
> **Mode**: `/investigate` (verify current state) → `/execute` → `/validate`

---

## Objective

Merge the four independent data arrays in the correlation hub page into a single chronological event stream and surface it as the default view.

Per the plan: the snapshot contract from Plan 32 is sufficient — no backend changes required.

## Deliverables

### 1. Unified timeline view (default)

- Merge error logs, rate-limit events, feedback reports, and email outbox entries into one chronologically sorted list
- Each entry shows: timestamp, event type (icon + label), summary, severity indicator
- Clicking an entry navigates to its detail view (existing drawers/pages)

### 2. View toggle

- Toggle between unified timeline (new default) and the original section-per-type layout
- Preference persisted (localStorage or user settings signal)

### 3. Cap-awareness

- When any section arrives at its defensive row limit, display a notice informing the admin that results may be truncated
- Suggest narrowing the time range or using the search (F5, future)

## Pre-work

- Read current correlation hub component to understand the four data arrays and their models
- Read `CorrelationController` response shape (from Educa.API) to confirm what fields are available
- Check if there's a shared timeline model or if one needs to be created

## Out of scope

- F2 (lateral navigation anchors) — separate phase, already has BE done (awaiting-prod)
- F3-F6 — later phases
- Backend changes — F1 is purely FE

## Validation

- `npm run lint` clean
- `npx tsc --noEmit -p tsconfig.app.json` clean
- Browser test: open a correlation hub page with data across multiple event types, verify chronological ordering, toggle between views, verify cap-awareness message when applicable

## Parallel

Can run simultaneously with P45 F2.2 (brief 288), P56 F1 (brief 287), and P24 sub-B (brief 286) — all different modules.
