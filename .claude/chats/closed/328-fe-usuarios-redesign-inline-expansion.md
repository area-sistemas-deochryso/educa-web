# 328 — Redesign /intranet/admin/usuarios: role-first tabs + inline expansion

> **Repos afectados**: `educa-web`
> **Plan**: none (design defined in this brief)
> **Creado**: 2026-06-17 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: `false`
> **modules**: `users-admin`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/users/**`

## Context

The current `/intranet/admin/usuarios` page uses a flat CRUD layout: header → 7 stats cards → filter bar → table → detail drawer. It works but has friction points:

1. **Stats cards** take a full row for non-actionable counters (7 cards, one per role + total).
2. **Table is role-agnostic** — users must filter by role before seeing what they want.
3. **Form dialog mutates by role** — fields appear/disappear after selecting role, causing uncertainty.
4. **Detail drawer is thin** — shows ~3 extra fields over what the table already shows.
5. **Actions are flat** — Import (students-only), Export (needs sub-dialog), New, Refresh all share the same header bar.
6. **"Validar Datos" button** is isolated at the bottom, easy to miss.

## Scope — Opción B: Role-first tabs + inline expansion

### 1. Replace stats cards with compact stat bar
- Single line: `142 total · 98 estudiantes · 12 profesores · 4 admin`
- Each number is a clickable badge that activates the corresponding tab/filter.
- Component: refactor `usuarios-stats` → `usuarios-stat-bar`.

### 2. Add role tabs below stat bar
- Tabs: `Todos` | `Estudiantes` | `Profesores` | `Personal Admin`
- Each tab pre-filters the table by role(s). "Personal Admin" groups Director + Asistente Admin + Promotor + Coord. Académico.
- Tab selection updates the URL query param (`?tab=estudiantes`) for shareability.
- New component: `usuarios-role-tabs`.

### 3. Promote search to header, collapse secondary filters
- Move the search input into the page header (right side, prominent).
- Role dropdown is REMOVED (replaced by tabs).
- Estado + Salón dropdowns remain as a collapsible filter row below tabs.
- Refactor `usuarios-filters` accordingly.

### 4. Contextual header actions
- Visible: search + "Nuevo [Rol]" button (label changes per active tab: "Nuevo Estudiante", "Nuevo Profesor", "Nuevo Usuario").
- Overflow menu (⋮): Export, Import (only in Estudiantes tab), Validar Datos, Refresh.
- Refactor `usuarios-header`.

### 5. Replace detail drawer with expandable row
- **Remove `usuario-detail-drawer` component entirely.**
- Use PrimeNG `p-table` row expansion (`[expandedRowKeys]` + `#expansion` template).
- Click on a row → expands a panel below showing all detail fields + quick actions.
- Accordion behavior: only one row expanded at a time.
- Panel layout:
  - Left: avatar with initials + name + role tag + status tag.
  - Right: detail fields grid (correo, teléfono, sede, grado, sección, apoderado, fecha registro).
  - For professors: inline list of salones + cursos.
  - Bottom: action buttons [Editar] [Desactivar/Activar] [Copiar DNI].
- New component: `usuario-inline-detail`.

### 6. Clean up table columns
- Remove ID column (not useful for users).
- Remove ACCIONES column (actions move to expanded panel).
- Keep: DNI, NOMBRE (with avatar initials instead of generic icon), SALÓN, ROL, ESTADO.
- Add chevron indicator (▸/▾) on leftmost position to signal expandability.

### 7. Form dialog improvements
- For creation: role is pre-selected based on active tab (no role dropdown needed if tab ≠ "Todos").
- If tab is "Todos", show role selector as first step.
- No stepper needed for now — keep single dialog but with role pre-filled.

## Out of scope

- Backend changes (no API modifications).
- Stepper-based creation flow (future enhancement).
- Mobile-specific responsive layout (follow existing responsive patterns).
- Changes to import/export/validation dialog internals.

## Implementation order

1. `usuarios-stat-bar` (replace stats cards)
2. `usuarios-role-tabs` (new component + wire to store filter)
3. Refactor `usuarios-header` (search promotion + contextual "Nuevo" + overflow menu)
4. Refactor `usuarios-filters` (remove role dropdown, collapsible)
5. `usuario-inline-detail` (expandable row panel)
6. Refactor `usuarios-table` (row expansion, remove ID/ACCIONES columns, add chevron + initials)
7. Remove `usuario-detail-drawer`
8. Wire form dialog role pre-selection from active tab

## Criterio de cierre

- [ ] FE: lint + build OK.
- [ ] Stats bar renders correctly with clickable badges.
- [ ] Tabs filter the table by role.
- [ ] Row expansion shows detail + quick actions, drawer is removed.
- [ ] "Nuevo" button label is contextual per tab.
- [ ] Search is in header, secondary filters collapsible.
- [ ] Existing flows (create, edit, import, export, validate) still work.

## Tiempo estimado

~120 min (multiple components touched, but no backend work).
