# 297 — P43 F6.2 FE: Bidirectional links + actionable Gap panel

> **Created**: 2026-06-02
> **Plan**: [xrepo-43](../../../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md) §F6 Chat 6.2
> **Repo**: educa-web
> **Depends on**: brief 296 (P43 F6.1 FE — recipient view exists for "Ver historial" links)
> **Mode**: `/execute` → `/validate`

---

## Objective

Close B12: no monitoring flow should be a visual dead-end. Every relevant row links to more context.

### 1. Gap panel enhancements
- Gap del día: each of the 14 missing-email students gets an action link
- "Sin rastro en outbox" → link to student profile
- Filter by salón (multiselect)
- Button "Exportar Excel" for the gap list

### 2. Bidirectional links across all monitoring views
- Bandeja, Blacklist, Cuarentena, Defer-events: each row with recipient → "Ver historial" link to F6.1 recipient view
- Auditoría: user findings → direct link (A13 already done), email findings → recipient view
- Reportes de usuario: if correlationId resolves to other lanes → clickable chip "Ver hub correlacionado"

## Resultado

### Implementado (§2 — Bidirectional links)
- **Bandeja** (`email-outbox-table`): botón "Ver historial" por `item.destinatario`
- **Blacklist** (`blacklist-table`): botón "Ver historial" por `item.correo`
- **Cuarentena** (`quarantine-table`): botón "Ver historial" por `item.destinatario`
- **Defer events** (`defer-event-item`): link inline "Ver historial" por `event().destinatario`
- **Auditoría** (`auditoria-correos-table`): botón "Ver historial" por `item.correoActual`
- **Feedback reports**: ya tenía `correlation-id-pill` → hub correlacionado (sin cambio)

### Diferido (§1 — Gap panel)
Gap panel requiere cambios BE: endpoint `/asistencias-sin-correo` no devuelve `salon` ni `studentId`. Crear brief BE separado.

## Validation

- ✅ lint: 0 errors, 0 warnings
- ✅ tsc --noEmit: clean
- ⏳ Browser test: pendiente post-deploy

> **Validación prod**: ⏳ pendiente desde 2026-06-04
