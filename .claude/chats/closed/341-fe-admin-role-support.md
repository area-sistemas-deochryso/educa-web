# 341 — FE: support Administrador role in usuarios and attendance views

> **Repos afectados**: `educa-web`
> **Plan**: `.claude/plan/329-admin-role-isolation.md` (Educa.API)
> **Depende de**: `Educa.API` branch `feat/admin-role-isolation` (commit `fe4ebfae`)
> **Creado**: 2026-06-20 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: `false`
> **modules**: `usuarios`, `attendance`, `auth`
> **touches**:
>   - `educa-web`: role constants, usuarios page, attendance tabs, auth/login

## Context

BE brief 329 added ROL_ID 8 = Administrador (code "N") to the Rol table. The admin user is now excluded from user listings and attendance queries for non-admin requesters. The admin can see all users including themselves.

The frontend needs to recognize "Administrador" as a valid role so the admin can:
1. Log in and see the correct menu/navigation
2. See themselves in the usuarios list
3. See the "Administrador" tab in attendance views (or not, since admin is passive)
4. The role appears correctly in dropdowns, filters, and UI labels

## Pre-work

- Identify where roles are defined as constants/enums in the frontend codebase
- Check the usuarios page role tabs/filters — does it iterate from a hardcoded list or from the API?
- Check if the attendance page has hardcoded role tabs
- Check auth/login flow — does it handle role routing (e.g., redirect based on role)?
- Check sidebar/menu — does it filter items by role name?

## Scope

### Role registration
- Add "Administrador" (code "N") to whatever role constants/enums exist in the frontend
- Ensure the auth flow recognizes the role for login routing and menu rendering

### Usuarios page
- The admin role should appear as a filterable tab in the usuarios list (same as Director, Asistente Admin, etc.)
- When logged in as admin, the admin user should be visible in the list
- When logged in as non-admin, the admin user won't appear (BE already filters this)

### Attendance views
- Admin is a passive role (no real attendance records) — same treatment as Director
- If attendance tabs iterate from a list, ensure Administrador is included but handled as passive
- The admin should NOT appear in attendance listings for non-admin users (BE handles this)

### Navigation/menu
- Admin should see the same menu items as Director (MenuGroup = "admin")
- Verify sidebar renders correctly for the Administrador role

## Out of scope

- Capability/permission changes — admin inherits Director's capabilities
- Creating/editing admin users from the UI (admin is managed directly in DB for now)
- Any BE changes (already done in brief 329)

## Criterio de cierre

- [ ] FE: Administrador role recognized in auth flow — admin can log in
- [ ] FE: Admin sees correct sidebar/menu (same as Director)
- [ ] FE: Usuarios page shows Administrador tab
- [ ] FE: Admin user visible in own listing, invisible for other roles
- [ ] FE: Attendance views handle admin as passive role
- [ ] FE: build + lint OK

## Tiempo estimado

~45 min (depends on how hardcoded the role lists are in the frontend).
