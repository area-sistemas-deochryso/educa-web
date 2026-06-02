# 284 — P22 F3.FE: Email outbox TipoFallo UI (badge + filter + disable retry)

> **Created**: 2026-06-02
> **Plan**: P22 — Endurecimiento correos asistencia CrossChex
> **Phase**: F3.FE (Chat 4 in plan) — UI admin outbox con TipoFallo
> **Repo**: educa-web
> **Suggested mode**: `/execute` (design complete in P22 plan, Chat 4 section)
> **Parallel**: yes — email module, no overlap with 285 (monitoreo) or 286 (crosschex BE).

## Context

F1 (EmailValidator) ✅ shipped. F2 (SmtpErrorClassifier + EO_TipoFallo column) ✅ shipped. F3.BE (ErrorLog + daily report job) ✅ shipped. F4.BE (audit endpoint) ✅ shipped. F5+F6 (throttle multi-sender) ✅ shipped. F5.6 (throttle widget FE) ✅ shipped.

The BE now classifies every outbox entry with `TipoFallo` (PERMANENT, TRANSIENT, NO_EMAIL, INVALID_FORMAT, etc.) and exposes it in the existing outbox endpoints.

## Scope

In `/intranet/admin/bandeja-correos` (email outbox admin page):

1. **Badge**: show `TipoFallo` as a severity badge on each row (PERMANENT = red, TRANSIENT = yellow, null/SENT = green)
2. **Filter**: add dropdown filter by `TipoFallo` to existing filters
3. **Disable retry**: "Reintentar" button disabled for PERMANENT failures with tooltip explaining why
4. **Investigate current state first** — plan is legacy (pre-ADR-0006), file paths and DTO shapes may have changed since April 2026

## Also pending (can bundle or split)

- **Chat 6 — F4.FE**: Pantalla `/intranet/admin/auditoria-correos` consuming the audit endpoint from F4.BE. If scope is manageable, bundle in this chat. If too large, create brief 287.

## Acceptance criteria

- [ ] TipoFallo badge visible on each outbox row
- [ ] Filter by TipoFallo works
- [ ] Retry button disabled for permanent failures
- [ ] Existing tests green + new specs for badge/filter logic
- [ ] Build + lint clean
