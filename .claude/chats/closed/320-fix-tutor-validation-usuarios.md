# 320 — Fix: enforce tutor requirement for professors in low-grade salons

> **Repos afectados**: `educa-web`
> **Creado**: 2026-06-15 · **Cerrado**: 2026-09-07 · **Estado**: ✅ cerrado — resuelto de forma más robusta que lo planteado, sin recuperar ningún código de este brief.
> **MODO SUGERIDO**: `/investigate` → `/execute`
> **exclusive**: `false`
> **modules**: `users`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/users/**`

## Problem

The user form dialog allows creating/assigning a professor to a salon with `GRA_Orden < 8` (Inicial, Primaria up to 4to) without marking them as tutor (`esTutor: true`). This violates the TutorPleno business rule: in those grades, the professor must be the salon's tutor to be eligible for schedule assignment.

## Evidence

Discovered during P64 F4: a professor (ID 15, MENDO CALDERON MARIELA) is assigned to "INICIAL 5 AÑOS A" but is NOT marked as tutor. When creating a horario for that salon, `getProfesoresCandidatos` returns 0 candidates because TutorPleno mode requires the professor to be the tutor — the professor exists but doesn't qualify.

## Expected behavior

In the user form dialog, when a professor is assigned to a salon with `GRA_Orden < 8`:
- The `esTutor` toggle should be auto-checked and disabled (or at minimum, validation should prevent saving without tutor flag).
- The backend already enforces this rule via `getProfesoresCandidatos` — the fix is FE-only to prevent creating inconsistent data.

## Key files

- `usuario-form-dialog.component.{ts,html}` — salon assignment section with tutor toggle
- `usuario-form-policies.utils.ts` — form policies by role
- `resolveModoAsignacion()` in `@data/models` — determines TutorPleno/PorCurso/Flexible

## Scope

- FE validation only: auto-set `esTutor: true` for salons with `GRA_Orden < 8`, or prevent saving without it.

## Out of scope

- Backend changes (already enforces correctly via candidate filtering).
- Fixing existing inconsistent data in DB (separate migration task if needed).

## Criterio de cierre

- [x] Cannot save a professor assigned to a low-grade salon without tutor flag. — Cubierto por `onAgregarSalon()` + checkbox deshabilitado (ver RESOLUCIÓN).
- [x] FE: lint + build OK.

## Tiempo estimado

~30 min (investigate) + ~30 min (execute).

## RESOLUCIÓN (2026-09-07, vía plan 108 F5)

Este brief quedó huérfano junto con el resto del linaje `pre-release` perdido el 2026-06-15 (ver `educa-coord/plans/xrepo/100-119/xrepo-108-recuperar-trabajo-huerfano-pre-release.md`). Su commit correspondiente, `9bbc999e` ("auto-set tutor flag for TutorPleno salons in professor form"), nunca llegó a `main`.

**Investigación (F5)**: el código actual de `usuario-form-dialog.component.ts`/`.helpers.ts` ya cubre el caso descrito, de forma más robusta que el commit original:
- `onAgregarSalon()` calcula `esTutor` automáticamente según `resolveModoAsignacion(salon.gradoOrden, salon.seccion) === 'TutorPleno'` (invariante `INV-AS06`).
- El checkbox de tutor se deshabilita en el template para salones TutorPleno, con tooltip explicativo.
- `computeSalonesAsignados()` recalcula `modo` en cada render desde el salón real — no puede quedar desactualizado.

**No se recupera `9bbc999e`** — superado.

**Hallazgo colateral corregido**: durante esta investigación se encontró que el flujo de auto-open desde horarios (agregado en plan 108 F4, brief 635) reproducía el mismo bug de clase — `defaults.salones` hardcodeaba `esTutor: false` sin pasar por `onAgregarSalon()`. Corregido en `main` (`c53aeb33`) calculando `esTutor` desde `resolveModoAsignacion` antes de armar los defaults.

**Dato inconsistente original** (profesor ID 15 en salón sin tutor) queda fuera de alcance — es una migración de datos aparte, no un fix de código.
