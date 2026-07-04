# 279 — P52 F5 FE: Attendance email gap tile in dashboard día

> **Created**: 2026-06-01 · **Plan**: [P52](../../../../educa-coord/plans/xrepo-52-email-outbox-manual-retry-diagnostics.md) · **Phase**: F5 (FE — Chat 5.2)
> **Repo**: educa-web · **Type**: FE feature
> **Suggested mode**: `/execute`
> **Depends on**: brief 278 (P52 F5 BE — gap detection endpoint)

## Scope

- New tile in `email-outbox-dashboard-dia/` showing attendances without confirmed email
- Source: `GET /asistencias-sin-correo?fecha=YYYY-MM-DD`
- Columns: Alumno, Grado, Tipo (Entrada/Salida), Hora registro, Estado correo (FAILED tag / "No generado" tag)
- Click on row: deep-link to bandeja filtered by destinatario
- Full coverage state: "Cobertura completa" positive message

## Acceptance criteria

- [x] Tile shows attendance gaps for selected day
- [x] FAILED vs "No generado" visually distinct (different tag colors)
- [x] Row click navigates to bandeja filtered by recipient
- [x] "Cobertura completa" shown when no gaps

> **Validación prod**: ⏳ pendiente desde 2026-06-01 — requiere brief 278 BE deployado
