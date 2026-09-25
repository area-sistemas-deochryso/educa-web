# 708 — Fix `home.component.spec.ts`: mock de `isEstudiante` roto

> **Origen**: detectado en validación de cierre del chat 707 (2026-09-25), test suite FE.

## CONTEXTO DEL CAMBIO

El commit `e6aa959e` ("feat(intranet): add Estudiante home widgets and shared 'horario de hoy'") introdujo un computed `showEstudianteWidgets` en `home.component.ts:55` que llama `this.userProfile.isEstudiante()`. El mock de `userProfile` en `home.component.spec.ts` no define `isEstudiante` como función.

## IMPACTO

12 de 2695 tests fallan, todos en `home.component.spec.ts` (único archivo rojo de 265). Mismo `TypeError: this.userProfile.isEstudiante is not a function`, que propaga también a `showHorarioHoyWidget`.

No bloqueó el cierre del chat 707 (cambio de 1 línea en `doc-watch.md`, sin relación) pero deja el test suite en rojo — corregir antes de que se acumule más deuda.

## CRITERIO DE CIERRE

- [ ] Mock de `userProfile` en `home.component.spec.ts` define `isEstudiante` (y cualquier otro método de rol usado por los computeds nuevos) como función mockeada.
- [ ] `npm test` verde (2695/2695).
