# 257 — Consume inline admin actions (Plan 43 F4-FE)

> **Origen**: Educa.API chat 252 · commit `075ea134` · 2026-05-27
> **Modo sugerido**: `/design` → `/execute`

## Contexto del cambio

BE shipped 3 admin endpoints for the email monitoring module:

1. `POST /api/sistema/email-outbox/{id}/reintentar` — retry failed email (returns 409 if blocked)
2. `GET /api/sistema/email-outbox/{id}/export` — JSON bundle for case export
3. `POST /api/sistema/email-blacklist/{id}/unblock` — body: `{ motivo: string }` (min 20 chars)

## Impacto en este repo

- [ ] Add service methods in email monitoring feature
- [ ] Wire retry button in outbox detail view (handle 409 with user-facing message)
- [ ] Wire export button (download or display JSON)
- [ ] Wire unblock action in blacklist detail/list (motivo textarea with min length validation)
