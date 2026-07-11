# 281 — P53 F3: FE duplicate person confirmation dialog

> **Created**: 2026-06-01
> **Plan**: P53 — Duplicate person validation (DNI unique + name soft check)
> **Phase**: F3 — FE confirmation dialog
> **Repo**: educa-web
> **Suggested mode**: `/execute` (design complete in P53 plan doc)
> **Parallel**: yes — different module than 282 (attendance). Use `/wt-new` for isolation.

## Context

F1 (SQL unique constraint) ✅ deployed. F2 (BE validation) ✅ shipped (`b62ce69`).

The BE now returns a structured duplicate error when creating/updating Estudiante, Profesor, or Director with matching `(Nombres, Apellidos, SED_CodID)` against active records. The error includes: CodID, partial DNI, Grado, Seccion of the existing record.

## Scope

Intercept the duplicate error response and show a confirmation dialog in all person creation/update forms:

1. **Detect** the structured duplicate error from BE (HTTP 409 or equivalent with duplicate payload)
2. **Show confirmation dialog**: "Ya existe [Nombre Apellidos] en esta sede (DNI: ...XX, Grado: X, Sección: X). ¿Confirmar registro?"
3. **If confirmed**: resend the same request with `confirmarDuplicado: true` in the body
4. **If cancelled**: return to form with no changes

## Affected forms

- Estudiante create/update
- Profesor create/update
- Director create/update

## Pre-work

1. Read the BE error response shape — check `PersonaService` or equivalent in Educa.API for the duplicate validation response format
2. Find the FE service/component for each entity's create/update form
3. Check if a reusable confirmation dialog component already exists

## Acceptance criteria

- [x] Duplicate name triggers confirmation dialog with existing record details
- [x] Confirming resends with `confirmarDuplicado: true` and succeeds
- [x] Cancelling returns to form preserving user input
- [x] Works for all 3 entity types (Estudiante, Profesor, Director)

> **Validación prod**: ⏳ pendiente desde 2026-06-01

## Out of scope

- AsistenteAdministrativo (not in F2 BE scope)
- Bulk import flows
- Cross-table detection
