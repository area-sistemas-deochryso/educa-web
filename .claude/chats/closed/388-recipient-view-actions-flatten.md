# 388 — P68 F4b: Recipient View inline actions + flatten tabs

> **Delegated from**: `educa-coord/chats/running/388-p68-f4b-recipient-view-actions-flatten.md`
> **Plan**: [`educa-coord/plans/xrepo-68-monitoreo-subpages-redesign.md`](../../../../educa-coord/plans/xrepo-68-monitoreo-subpages-redesign.md) — Phase F4
> **Created**: 2026-06-30 · **Estado**: ✅ implementado, pendiente verificación.
> **Validación prod**: ⏳ pendiente desde 2026-07-04 — bloqueada por gap de permisos preexistente (ver brief de fix asociado). Lint + build OK; verificación visual en navegador de las acciones (blacklist/unblock, liberar cuarentena) no se pudo completar porque la ruta `intranet/admin/monitoreo/correos/persona` no tiene ninguna capability registrada en el catálogo — bug preexistente de brief 296, no introducido por este cambio.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: `false`
> **modules**: `monitoreo`
> **parallel-group**: `P68-wave-1`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/recipient-view/**`

## Context

Recipient View is read-only during incidents — admin sees status but can't act (blacklist, release quarantine). Must navigate to defense pages separately. Also, 5 tabs with only 2-4 fields each is overkill.

## Scope

### educa-web
- Add inline action buttons: blacklist/unblock, release quarantine — call the same BE endpoints as defense pages
- Flatten 5 sparse tabs into a single scrollable profile (each tab only has 2-4 fields)
- Add cross-links to outbox history and defer events for the specific email
- Show confirmation dialog before destructive actions (blacklist)

### Educa.API (read-only reuse, no changes expected)
- No new endpoints — reuse existing blacklist and quarantine action endpoints
- Verify existing endpoints accept the parameters Recipient View will send

## Pre-work

- Read recipient-view component and its 5 tab components
- Read recipient-view-api.service.ts for current API calls
- Read blacklist and quarantine services for the action endpoints to reuse

## Out of scope

- Auditoría rename (brief 387 — F4a)
- New recipient data or fields
- SignalR for recipient view

## Criterio de cierre

- [ ] FE: lint + build OK
- [ ] Blacklist/unblock and release quarantine actions work from recipient view
- [ ] Tabs flattened to single scrollable profile
- [ ] Cross-links to outbox history and defer events functional

## Tiempo estimado

~120 min.
