# 632 — P108 F1 FE: recuperar candidatos filtrados en drawer de horarios

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-108-recuperar-trabajo-huerfano-pre-release.md` (Fase F1)
> **Creado**: 2026-09-07 · **Estado**: 🟢 libre — independiente del resto de fases del plan 108.
> **MODO SUGERIDO**: `/investigate` → `/execute`
> **exclusive**: `false`
> **modules**: `admin-schedules`
> **touches**:
>   - `educa-web`: `src/app/features/intranet/pages/admin/schedules/` (horarios.component.html, horarios.store.ts, horarios-data.facade.ts, horarios-api.service.ts)

## OBJETIVO

Recuperar el wiring FE perdido de P59: el drawer de horarios debe consumir `GET /api/horario/{id}/profesores-candidatos` (BE ya en `Educa.API@main`) en vez de la lista estática de `profesoresOptions`, para que el selector solo muestre profesores que pasan las reglas de dominio (modo + conflicto de horario).

Commit original de referencia: `a77eba58` (rama de rescate `recover/P61-workflow-continuity`, también presente en `recover/pre-release-chain-2026-06-15`).

## PRE-WORK OBLIGATORIO

- Confirmar que el endpoint BE `GET /api/horario/{id}/profesores-candidatos` sigue existiendo y con el mismo contrato en `Educa.API@main` (el plan 108 lo asume ya desplegado).
- **Cherry-pick en seco ya verificado (2026-09-07) — conflictúa.** `git cherry-pick -n a77eba58` contra `main` actual:
  - `horaria-api.service.ts` — aplica **limpio**.
  - `horarios.component.html`, `horarios-data.facade.ts`, `horarios.store.ts` — **conflicto de contenido** en los tres.
  - Conclusión: no aplicar el diff original tal cual. Usar `a77eba58` como referencia funcional (qué señal expone el store, cómo se combina con `forkJoin` del detalle) y reimplementar el wiring sobre la versión actual de `horarios.store.ts` / `horarios-data.facade.ts` / `horarios.component.html`.
- Antes de tocar código, revisar con `git show a77eba58` el diff completo para entender la forma original (signal `profesoresCandidatos`, llamada en paralelo con el detalle vía `forkJoin`).

## ALCANCE

- `SchedulesApiService` (o el service actual equivalente a `horarios-api.service.ts`): agregar el método de consumo de `profesores-candidatos`.
- Signal/estado en el store para los candidatos filtrados.
- Binding del drawer de horarios para usar los candidatos filtrados en vez de `profesoresOptions` estático.
- Preservar el comportamiento de carga en paralelo con el detalle (no bloquear el drawer esperando candidatos si el detalle ya cargó, según el patrón original con `forkJoin`).

## FUERA DE ALCANCE

- Cualquier otro fix del plan 108 (P60, P61, P64, tutor-flag) — cada uno tiene su propio brief.
- Cambios al BE — el endpoint ya existe y está fuera de este brief.
- Reimplementar el patrón de `forkJoin` si la arquitectura actual del store (señales/effects) ya resuelve la carga paralela de otra forma — usar el patrón nativo de la versión actual, no forzar el de junio.

## VALIDACIÓN FINAL

- Abrir el drawer de horarios sobre un horario real y confirmar que el selector de profesores solo lista candidatos que pasan las reglas de dominio (modo + sin conflicto de horario) — no la lista completa de docentes.
- Verificar que la carga de candidatos no bloquea ni retrasa visiblemente la apertura del drawer respecto del comportamiento actual.
- Build + tests unit verdes.

## CRITERIOS DE CIERRE

- [x] Wiring FE de candidatos filtrados funcional en el drawer de horarios.
- [x] Verificado en vivo contra un horario real.
- [x] `educa-coord/plans/xrepo/100-119/xrepo-108-recuperar-trabajo-huerfano-pre-release.md` actualizado (F1 marcada).
- [x] `educa-coord/plans/maestro.md` actualizado (fila P108) — quedan F2-F6 pendientes, plan sigue abierto.
- [x] Brief movido `running/` → `closed/`.

## RESULTADO (2026-09-07)

- **Diseño elegido**: reemplazo total — `profesoresParaAsignacionDetalle` pasa a derivar exclusivamente de `GET /api/horario/{id}/profesores-candidatos` (server-side, modo + conflicto de horario), reemplazando el filtro client-side de modo (`profesoresParaSalon`) que ya existía. Ese filtro client-side se mantiene intacto para el formulario de creación/edición (sin `horarioId`), fuera de alcance.
- **Carga no bloqueante**: `loadProfesoresCandidatos` se dispara como efecto secundario tras resolver el detalle (mismo patrón que `loadProfesoresCurso`), sin `forkJoin` — no retrasa la apertura del drawer.
- **Archivos tocados**: `services/horarios-api.service.ts`, `services/horarios.store.ts`, `services/horarios-data.facade.ts`.
- **Validado**: lint + build + 2533 tests unit (`npm test`) en verde. Smoke en navegador (Node 22 vía `fnm`, BE local `dotnet run`, sesión "CODE CLAUDE/Administrador") contra datos reales: modo PorCurso (horario 18, curso de test sin `ProfesorCurso` → lista vacía correcta) y modo TutorPleno (horario 20 → solo el tutor del salón aparece como candidato). Sin conflicto de horario real disponible en la data de prueba para validar ese caso puntual (la regla ya está cubierta por tests BE existentes, no tocados).
- **Commit**: `fc0aa496` en `chat/632-fe-p108-f1-candidatos-filtrados-recovery`.

## COMMIT MESSAGE sugerido

```
feat(schedules): wire drawer to filtered professor candidates (P108 F1, recovers P59)
```

## CIERRE

Este brief cierra solo F1 del plan 108. El plan permanece abierto (F2-F6 pendientes) hasta que se recuperen o descarten explícitamente. Las ramas `recover/P61-workflow-continuity` y `recover/pre-release-chain-2026-06-15` **no se borran** al cerrar este brief — se mantienen hasta que todo el plan 108 esté resuelto.
