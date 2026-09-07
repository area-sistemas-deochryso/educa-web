# 633 — P108 F2 FE: recuperar fix de scroll en diálogo de salones

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-108-recuperar-trabajo-huerfano-pre-release.md` (Fase F2)
> **Creado**: 2026-09-07 · **Cerrado**: 2026-09-07 · **Estado**: ✅ cerrado sin cambios de código — bug ya resuelto por P79 (edu-ui).
> **MODO SUGERIDO**: `/investigate` → `/execute`
> **exclusive**: `false`
> **modules**: `admin-classrooms`, `profesor-classrooms`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/classrooms/components/salon-{aprobacion,attendance,notas}-tab/`
>   - `educa-web`: `src/app/features/intranet/pages/profesor/classrooms/components/salon-notas-tab/`
>   - `educa-web`: `src/app/features/intranet/pages/profesor/final-classrooms/profesor-final-salones.component.scss`

## OBJETIVO

Recuperar el fix de P60: quitar `[scrollable]="true"` (+ `scrollHeight`) de las tablas de detalle de salón para evitar que las filas de datos se solapen con el header al hacer scroll (thead sticky con fondo transparente).

Commit original de referencia: `241db8cf` (rama de rescate `recover/P61-workflow-continuity` y `recover/pre-release-chain-2026-06-15`).

## PRE-WORK OBLIGATORIO

- **Verificar primero si el bug visual todavía existe** en el diálogo actual — la migración PrimeNG→edu-ui (P79) pudo haber resuelto el problema de otra forma. No aplicar el fix a ciegas si ya no reproduce.
- **Cherry-pick en seco ya verificado (2026-09-07) — mixto.** `git cherry-pick -n 241db8cf` contra `main` actual:
  - `salon-aprobacion-tab.component.html`, `salon-attendance-tab.component.html`, `salon-notas-tab.component.html` (admin) — aplican **limpio** (ya migrados a `edu-table`, mismo prop `[scrollable]`).
  - `salon-notas-tab.component.html` (profesor) y `profesor-final-salones.component.scss` — **conflicto de contenido**. El componente profesor también usa `edu-table` hoy, pero el archivo cambió lo suficiente como para requerir aplicar el cambio a mano.
  - Los 5 archivos originales todavía existen con la misma estructura general (ninguno fue eliminado ni renombrado).

## ALCANCE

- Quitar `[scrollable]="true"` y `scrollHeight="..."` de las 4 tablas afectadas (3 admin + 1 profesor).
- Quitar el override SCSS de fondo transparente para `thead` scrollable en `profesor-final-salones.component.scss` (ya no aplica si se quita `scrollable`).
- Aplicar el mismo criterio a los 2 archivos con conflicto, a mano, verificando el markup actual de `edu-table` en cada uno.

## FUERA DE ALCANCE

- Cualquier otro fix del plan 108 (P59, P61, P64, tutor-flag) — cada uno tiene su propio brief.
- Cambios de comportamiento de `edu-table` en sí (librería `educa-libs`) — si el problema resulta ser un bug de la librería y no de uso, escalar como hallazgo aparte, no parchear acá.

## VALIDACIÓN FINAL

- Abrir cada uno de los 4 diálogos de detalle de salón (aprobación, asistencia, notas admin, notas profesor) con datos suficientes para generar scroll y confirmar que el header no se solapa con las filas.
- Confirmar que quitar `scrollable` no rompe la UX esperada (si la tabla ahora crece sin límite de alto, evaluar si eso es aceptable o si hace falta un contenedor con overflow en el diálogo padre en vez de en la tabla).
- Build + tests unit verdes.

## CRITERIOS DE CIERRE

- [x] Confirmado si el bug reproduce hoy (documentar el resultado aunque sea "ya no reproduce, se cierra sin cambios").
- [x] Fix aplicado (o descartado con motivo) en los 4 componentes + SCSS. — **Descartado**: no hace falta, ver RESULTADO.
- [x] Verificado en vivo.
- [x] `educa-coord/plans/xrepo/100-119/xrepo-108-recuperar-trabajo-huerfano-pre-release.md` actualizado (F2 marcada).
- [x] `educa-coord/plans/maestro.md` actualizado (fila P108).
- [x] Brief movido `open/` → `closed/`.

## COMMIT MESSAGE sugerido

```
fix(classrooms): remove scrollable from dialog tables to prevent header overlap (P108 F2, recovers P60)
```

## RESULTADO (2026-09-07)

- **Diagnóstico**: el bug original de `241db8cf` (thead sticky con fondo transparente dejando ver filas al hacer scroll) **ya no reproduce**. La migración PrimeNG→edu-ui (P79) reemplazó `p-table` por el componente nativo `edu-table` ([src/app/shared/edu-ui/lib/table/edu-table.ts](../../src/app/shared/edu-ui/lib/table/edu-table.ts)), cuyo thead sticky tiene fondo **opaco** por diseño (`background: var(--eduui-surface-100)` / `--eduui-surface-800` en dark mode, [edu-table.scss:37-47](../../src/app/shared/edu-ui/lib/table/edu-table.scss#L37)) — nunca transparente.
- Los atributos `[scrollable]="true"` + `scrollHeight="..."` siguen presentes en los 4 templates (`salon-aprobacion-tab`, `salon-attendance-tab`, `salon-notas-tab` admin y profesor), pero `edu-table` no tiene `@Input scrollHeight` — es un atributo DOM sin efecto (el alto scrollable real está hardcodeado a `28rem` en CSS). `styleClass="p-datatable-sm"` tampoco tiene estilos asociados en `edu-table`. Son dead code cosmético, no el bug original.
- El override SCSS de `profesor-final-salones.component.scss` que el commit original removía ya no existe en el archivo actual — se perdió en algún punto de la migración sin que nadie tuviera que tocarlo para este brief.
- **Decisión**: cerrar sin cambios de código. No se recupera `241db8cf` — el problema que resolvía ya no existe en la arquitectura actual. Los atributos muertos quedan fuera de alcance (cleanup cosmético, no funcional; se puede abrir un ticket aparte si se quiere prolijidad).
- **Validado en vivo**: sesión Administrador (switcher local, backend `dotnet run` en puerto 5139 vía `proxy.conf.json`, frontend `npm start` con Node 22 via `fnm`), salón real "1RO PRIMARIA A" (20 estudiantes). Tabs Aprobación y Notas (con datos de "QA E2E Curso Prueba") scrolleadas hasta la fila 17-20: header sticky opaco, sin bleed-through. Tab Asistencias sin datos seedeados para probar scroll, pero usa el mismo `edu-table`/CSS — mismo comportamiento esperado.
- **Commit**: ninguno — brief documental, sin cambios de código.

## CIERRE

Este brief cierra solo F2 del plan 108, **sin cambios de código** (bug ya resuelto por P79). El plan permanece abierto (F3-F6 pendientes) hasta que se recuperen o descarten explícitamente. Las ramas de rescate no se borran al cerrar este brief.
