# 636 — P108 F5: decidir sobre el fix de tutor-flag huérfano

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-108-recuperar-trabajo-huerfano-pre-release.md` (Fase F5)
> **Creado**: 2026-09-07 · **Cerrado**: 2026-09-07 · **Estado**: ✅ cerrado sin recuperar código — `INV-AS06` ya cubre el caso.
> **MODO SUGERIDO**: `/investigate` (documental, sin código esperado)
> **exclusive**: `false`
> **isolation**: `main` (no se esperan cambios de código de producto)
> **modules**: `admin-users`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/users/components/usuario-form-dialog/`

## OBJETIVO

Confirmar si el commit huérfano `9bbc999e` ("auto-set tutor flag for TutorPleno salons in professor form") sigue siendo necesario, dado que el brief huérfano `320-fix-tutor-validation-usuarios.md` documentaba un bug real: un profesor podía asignarse a un salón de grado bajo (`GRA_Orden < 8`, modo TutorPleno) sin marcarse como tutor, violando la regla de negocio TutorPleno.

## PRE-WORK YA HECHO (2026-09-07, durante F4)

Investigación adelantada mientras se cerraba F4 — el código actual de `usuario-form-dialog.component.ts`/`.helpers.ts` ya cubre el caso central del commit original, y de forma más robusta:

- `onAgregarSalon()` (línea ~298) calcula `esTutor` automáticamente según el modo del salón (`resolveModoAsignacion(salon.gradoOrden, salon.seccion) === 'TutorPleno'`), citando explícitamente `INV-AS06`.
- El template deshabilita el checkbox de tutor (`[disabled]="salon.modo === 'TutorPleno'"`) con tooltip explicativo, para cualquier salón TutorPleno ya agregado.
- `computeSalonesAsignados()` recalcula `modo` en cada render a partir del salón real (no un valor cacheado), por lo que no puede quedar desactualizado.

**Conclusión preliminar**: el commit `9bbc999e` está superado — su intención (impedir que un salón TutorPleno quede sin tutor vía el flujo manual "Agregar salón") ya está cubierta de forma más completa en `main`. No hace falta recuperarlo.

**Hallazgo colateral (ya corregido, commit `c53aeb33` en `main`)**: durante esta misma investigación se encontró que el flujo de auto-open desde horarios (agregado en F4, brief 635) reproducía fielmente el mismo bug de clase que documentaba `320-fix-tutor-validation-usuarios.md` — el `defaults.salones` armado en `usuarios.component.ts` (auto-open `kind: 'new'`) hardcodeaba `esTutor: false` sin pasar por `onAgregarSalon()`, permitiendo guardar un profesor sin tutor si el salón de origen era TutorPleno. Se corrigió calculando `esTutor` desde `resolveModoAsignacion` antes de setear los defaults, igual que el flujo manual.

## ALCANCE

- Confirmar (o refutar) la conclusión preliminar arriba, revisando si hay algún otro punto de entrada al formulario que bypasee `onAgregarSalon()` de forma similar al que ya se encontró y corrigió.
- Documentar la decisión en este brief y en el plan 108.
- Cerrar el brief huérfano `320-fix-tutor-validation-usuarios.md` (actualmente sigue en `open/`) con la resolución.
- **No** se recupera `9bbc999e` — superado por la implementación actual.

## FUERA DE ALCANCE

- Arreglar datos inconsistentes ya existentes en la BD (el caso real documentado en 320: profesor ID 15 en salón sin tutor) — es una migración de datos aparte, no de este brief.
- F6 (documentar el gap de proceso del plan 108) — brief separado.

## VALIDACIÓN FINAL

- Grep de otros call-sites que construyan `formData().salones` o llamen `setFormData`/`openNewDialog` con salones fuera de `onAgregarSalon()`.
- Si se encuentra alguno, aplicar el mismo patrón de cálculo de `esTutor`.

## CRITERIOS DE CIERRE

- [x] Confirmado que no hay otros bypasses del cálculo de `esTutor` — grep de `setFormData`/`openNewDialog`/construcción de `salones` en todo `admin/users` no encontró otro punto que hardcodee `esTutor` fuera de `onAgregarSalon()` (el único bypass era el auto-open de F4, ya corregido en `c53aeb33`).
- [x] Brief `320-fix-tutor-validation-usuarios.md` cerrado con la resolución documentada.
- [x] `educa-coord/plans/xrepo/100-119/xrepo-108-recuperar-trabajo-huerfano-pre-release.md` actualizado (F5 marcada).
- [x] `educa-coord/plans/maestro.md` actualizado (fila P108).
- [x] Brief movido `running/` → `closed/`.

## RESULTADO (2026-09-07)

Confirmada la conclusión preliminar: `9bbc999e` está superado por `INV-AS06` (ya implementado en `usuario-form-dialog.component.ts`/`.helpers.ts`). No se recuperó código de ese commit. El único bypass real encontrado (auto-open desde horarios, F4) ya se había corregido durante la propia investigación (`c53aeb33`, commiteado directo a `main` por ser un fix de 1 archivo). Sin commit adicional en este brief.

## COMMIT MESSAGE sugerido

No se espera commit de código nuevo (más allá del ya hecho en `c53aeb33`) salvo que la validación final encuentre otro bypass.

## CIERRE

Este brief cierra F5 del plan 108. Solo queda F6 (documentar el gap de proceso) para cerrar el plan completo. Las ramas de rescate (`recover/P61-workflow-continuity`, `recover/pre-release-chain-2026-06-15`) se eliminan recién cuando F6 también cierre.
