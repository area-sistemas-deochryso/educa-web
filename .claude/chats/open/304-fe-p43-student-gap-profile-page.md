# 304 — P43 FE: Student gap profile page (populate placeholder)

> **Created**: 2026-06-04
> **Plan**: [xrepo-43](../../../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md) §F6.3 follow-up
> **Repo**: educa-web (FE-only si hay endpoint, xrepo si no)
> **Depends on**: brief 303 (gap panel UI — deployed)
> **Mode**: `/design` → `/execute` → `/validate`

---

## Context

Brief 303 created the gap panel (salon filter, export Excel) and a **placeholder** student profile page at `/intranet/admin/monitoreo/correos/estudiante/:id`. The route works and permissions are wired via `permissionPath` override reusing the dashboard permission (VIS_CodID 48).

The page currently shows only "Perfil del estudiante — ID: N" with no useful data.

## What this brief should deliver

Populate the placeholder with data relevant to the gap panel context:

### Option A — FE-only (if existing endpoints suffice)
Reuse data already available from existing endpoints:
- Student name + salon from the gap panel data (pass via route state or re-query)
- Attendance history from existing attendance endpoints
- Email outbox history filtered by student (if `/api/sistema/email-outbox/listar` supports `estudianteId` filter)

### Option B — Needs BE endpoint
If no existing endpoint provides student-scoped data:
- **BE brief needed**: `GET /api/sistema/estudiantes/:id/gap-summary` returning attendance + email outbox history for a student
- FE consumes and renders

## Investigation needed (first step)

Before designing, investigate:
1. Does `/api/sistema/email-outbox/listar` accept `estudianteId` as filter?
2. Is there an attendance endpoint that accepts `estudianteId`?
3. What data would be most useful in the gap context? (attendance gaps, email failures, contact info)

## Acceptance criteria

- [ ] Page shows student name, salon, grado
- [ ] Page shows attendance/email gap history for this student
- [ ] "Volver al dashboard" button works (already implemented)
- [ ] lint + tsc clean

## Files already created (from brief 303)

- `src/app/features/intranet/pages/admin/student-gap-profile/` — component, template, SCSS, barrel
- `src/app/features/intranet/pages/admin/monitoreo/monitoreo.routes.ts` — route registered
