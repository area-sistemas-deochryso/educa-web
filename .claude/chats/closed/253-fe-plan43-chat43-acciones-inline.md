# 253 — P43 Chat 4.3b: Acciones inline — FE row actions

> **Created**: 2026-05-27
> **Closed**: 2026-05-27
> **Plan**: [xrepo-43-monitoreo-cowork-feedback-2026-05-11.md](../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md) · Fase 4 · Chat 4.3 · FE split
> **Coord brief**: [251](../../../educa-coord/.claude/chats/running/251-xrepo-plan43-chat43-acciones-inline.md)
> **Depends on**: [252 BE](../../../Educa.API/.claude/chats/open/252-be-plan43-chat43-acciones-inline.md) (endpoints must exist) — ✅ verified deployed
> **Repo**: educa-web
> **Modo**: `/investigate` → `/execute` → `/validate`

## Scope

Row action buttons in Bandeja, Blacklist, and Cuarentena tables. Consumes the 3 endpoints from brief 252.

## Done

- [x] **Retry 409 handling**: `reintentar()` no longer swallows errors. Facade handles 409 with toast showing blacklisted/quarantined reason. Success toast on requeue. 404 handled.
- [x] **Export caso drawer**: New `EmailOutboxExportDto` model (11 interfaces). Service method `exportarCaso(id)`. Store signals. Drawer with formatted sections (outbox, defers, blacklist, quarantine, correlation) + "Descargar JSON" button. Wired via `pi-file-export` button on every row.
- [x] **Unblock con motivo**: New `unblock(id, motivo)` service method (POST `/{id}/unblock`). WAL-optimistic facade. Custom dialog with textarea (min 20 chars) + counter. Table button changed from `pi-times` "Despejar" to `pi-lock-open` "Desbloquear". Detail drawer button also updated.
- [x] Build passes (0 errors).
- [x] Visual validation: export drawer, unblock dialog, UI consistency confirmed in browser.
- [ ] Retry button visual test deferred (no FAILED rows in current data).

## Design decision: export

Drawer visual con download JSON adentro (opción 3). Drawer muestra secciones formateadas; botón "Descargar JSON" genera archivo `email-caso-{id}.json`.

## Learnings

1. PrimeNG 21: `TextareaModule` from `'primeng/textarea'`, directive is `pTextarea` (not `pInputTextarea`).
2. Existing "Despejar" (DELETE by correo) coexists with new "Desbloquear" (POST by id with motivo) — different endpoints, different accountability level.
3. BE brief 252 was already in `running/` with all 3 endpoints implemented when FE started.
