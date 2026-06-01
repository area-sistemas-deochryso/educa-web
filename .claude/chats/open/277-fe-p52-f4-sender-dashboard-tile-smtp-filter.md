# 277 — P52 F4 FE: Sender failure dashboard tile + SMTP code filter

> **Created**: 2026-06-01 · **Plan**: [P52](../../../../educa-coord/plans/xrepo-52-email-outbox-manual-retry-diagnostics.md) · **Phase**: F4 (FE portion)
> **Repo**: educa-web · **Type**: FE feature
> **Suggested mode**: `/execute`
> **Depends on**: brief 276 (P52 F4 BE — SMTP filter + sender dashboard endpoint)

## Context

- F1-F3 ✅ shipped
- F4 BE ✅ (brief 276): `GET /dashboard-dia/fallos-por-sender` endpoint + `lastSmtpCode` filter on list

## Scope — two deliverables

### 1. SMTP code filter in outbox list

- Add SMTP code filter input (numeric or dropdown with known codes: 535, 421, 550) to the outbox bandeja filters
- Wire to the `lastSmtpCode` query param already accepted by BE list endpoint

### 2. Sender failure tile in dashboard día

- New tile in `email-outbox-dashboard-dia/` showing pivot table: sender × tipoFallo with counts
- Source: `GET /dashboard-dia/fallos-por-sender?fecha=YYYY-MM-DD`
- If all counts are 0 / empty array: show "Sin fallos en el día" (don't hide the tile)
- Reuse existing chart/table wrapper pattern from P43 F5

## Acceptance criteria

- [ ] Outbox list can be filtered by SMTP code
- [ ] Dashboard día shows sender×tipoFallo pivot tile
- [ ] Empty day shows "Sin fallos" state, not hidden tile
- [ ] Historical entries with null sender show "Desconocido"
