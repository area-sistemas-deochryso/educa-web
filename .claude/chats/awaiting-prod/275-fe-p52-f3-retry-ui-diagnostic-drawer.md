# 275 — P52 F3: Email outbox retry UI + diagnostic drawer (FE)

> **Created**: 2026-06-01 · **Plan**: [P52](../../../../educa-coord/plans/xrepo-52-email-outbox-manual-retry-diagnostics.md) · **Phase**: F3
> **Repo**: educa-web · **Type**: FE feature
> **Suggested mode**: `/execute`
> **Validación prod**: ⏳ pendiente desde 2026-06-01
> **Design**: completed in coord brief 274 (pilot session 2026-06-01)

## Context

- F1 BE ✅: sender persisted, SMTP code extracted, FAILED_AUTH classification
- F2 BE ✅ (`6b3d42b`): `POST /{id}/manual-retry` + `GET /{id}/manual-attempts` + `EmailOutboxManualAttempt` audit table
- FE F1 ✅ (`8a5b9eb5`): FAILED_AUTH label + filter in list
- Existing: requeue button in list (calls `/reintentar`), detail drawer with basic fields

## Scope — two checkpoints

### Checkpoint 1: F3a — Diagnostic fields in drawer

1. **Extend detail model** with 5 missing fields: `remitente`, `lastSmtpCode`, `lastSmtpMessage`, `lastAttemptAt`, `bounceSource`
2. **Verify BE mapper** fills these fields in the `GET /{id}` response (they exist in BE DTO but may not be projected)
3. **Add "Technical diagnostic" collapsible section** in drawer:
   - Remitente (sender used)
   - SMTP code + message (same line: `535 — Incorrect authentication data`)
   - Last attempt timestamp
   - Bounce source (if present)
   - Full correlation ID with copy button
4. **Auto-expand for FAILED**, collapsed for SENT

### Checkpoint 2: F3b — Manual retry dialog + attempts history

1. **"Retry manual" button** in drawer, visible only when `estado === 'FAILED'`
2. **Confirmation dialog** on click:
   - Shows: destinatario, asunto, current tipo fallo
   - Sender dropdown: populated from `GET /throttle-status` (extract sender addresses). Default: "Automático (round-robin)"
   - Confirm / Cancel buttons
3. **On confirm**: call `POST /{id}/manual-retry` with optional `senderAddress`
   - Success: toast + refresh drawer (estado flips to SENT, button disappears)
   - Failure: show SMTP code + error inline in dialog before closing
4. **"Manual attempts" collapsible section** below diagnostics:
   - Source: `GET /{id}/manual-attempts`
   - Columns: #, Date, Sender, Forced?, Result (SENT/FAILED tag), SMTP Code, Error, Duration, Operator
   - Ordered by date desc
   - Hidden when empty

## BE endpoints available (no BE work needed)

| Method | Path | Returns |
|---|---|---|
| POST | `/{id}/manual-retry` | `ManualRetryResultDto` (attemptId, resultado, senderAddress, smtpCode, smtpMessage, duracionMs, tipoFallo) |
| GET | `/{id}/manual-attempts` | `EmailOutboxManualAttemptDto[]` |
| GET | `/throttle-status` | Per-sender metrics (extract addresses for dropdown) |

## Design decisions (from brief 274)

- Two actions: existing requeue button unchanged + new manual retry in drawer
- Manual retry requires confirmation dialog with sender selector
- Diagnostic fields go in collapsible section (expanded for FAILED)
- Attempts history in separate collapsible section below diagnostics

## Key constraints

- INV-MAIL02: retry must not affect blacklist counters (BE-enforced, FE just calls endpoint)
- INV-MAIL10: retry must not affect cession logic (BE-enforced)
- Design system B1-B11: collapsible sections follow P45 F2 pattern
- Existing requeue in list row must remain unchanged

## Contract checklist

- [ ] Detail drawer renders `remitente`, `lastSmtpCode`, `lastSmtpMessage`, `lastAttemptAt`, `bounceSource`
- [ ] Diagnostic section collapsed for SENT, expanded for FAILED
- [ ] "Retry manual" button visible only when `estado === 'FAILED'`
- [ ] Confirmation dialog opens with sender dropdown from throttle-status
- [ ] Confirmation calls `POST /{id}/manual-retry` with optional `senderAddress`
- [ ] Retry result displayed before dialog closes
- [ ] Manual attempts table shows all data from `GET /{id}/manual-attempts`, ordered by date desc
- [ ] Attempts section hidden when no manual attempts exist
- [ ] Existing requeue button in list row unchanged
