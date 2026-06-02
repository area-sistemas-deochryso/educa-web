# 292 — P38 FE: Blacklist admin tab + alert banner

> **Created**: 2026-06-02
> **Plan**: [xrepo-38](../../../../../educa-coord/plans/xrepo-38-blacklist-detection-admin.md)
> **Repo**: educa-web
> **Depends on**: brief 291 (P38 BE — endpoints)
> **Mode**: `/execute` → `/validate`

---

## Objective

### 1. Tab "Blacklist" in `/intranet/admin/email-outbox` (P4)
- Server-paginated table consuming GET endpoint from brief 291
- Columns: correo, motivo, estado, fecha blacklist, fecha último fallo, observación
- Filters: estado, motivo, búsqueda por correo
- Drawer de detalle per entry
- Dialog "Agregar manualmente" → POST endpoint
- Button "Despejar" → existing DELETE endpoint
- Export CSV

### 2. Alert banner + toast (P6)
- SignalR toast + banner B9 when `defer-fail-status` reaches 4/5 (configurable threshold)
- Shown in `/intranet/admin/email-outbox`

## Pre-work

- Read current email-outbox page structure (tabs, components)
- Verify brief 291 BE endpoints are deployed/available
- Read existing Cuarentena tab (Plan 37) for pattern reference

## Validation

- lint + tsc clean
- Browser test: navigate to blacklist tab, verify paginated list, add manually, filter, despeje
