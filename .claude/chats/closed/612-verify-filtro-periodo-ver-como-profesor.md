> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 104 (coord) · **Fase**: F3 · **Creado**: 2026-08-28 · **Estado**: ⏳ abierto, desbloqueado.
> **depends_on**: F2 (brief 611, `Educa.API`) — ✅ cerrado 2026-08-29 (`chat/611-be-fix-ver-como-profesor-asistencia-mes-404`, pendiente `/wt-merge`). Profesor de prueba usado por F2: **RAMIREZ BERNARDO JOSE DANIEL** (DNI 76357038, profesorId 22) — tiene asistencias reales (abril 2026) pero **no tiene salones-tutor**, así que no sirve para este brief (ver razón abajo); buscar otro profesor de prueba con salones-tutor en ambos periodos.

---

# 612 — Verificar filtro de periodo (verano/regular) bajo "ver como" Profesor

## Contexto

Tercer hallazgo del plan 104 (mismo origen que F1/578 y F2/611): mismo antipatrón "ver como" (P92), esta vez sobre el filtro de periodo académico en Asistencia. Descubierto durante el cierre de F1 (2026-08-28) — el filtro de periodo ya existe en el componente pero nunca fue alcanzable en vivo bajo "ver como" porque el bug de F1 nunca dejaba montar el componente correcto.

## Por qué depende de F2 (611)

F3 necesita verificar en vivo con un profesor de prueba que tenga salones-tutor en **ambos** periodos (verano y regular). El profesor usado para verificar F1 (RAMIREZ BERNARDO) no tiene tab "Mis estudiantes" — sin salones como tutor, no sirve para este caso. F2 (611) probablemente necesita el mismo tipo de profesor de prueba real para su propia verificación (`profesor/me/mes` con datos reales) — hipótesis del plan: conviene resolver F2 primero y reusar el mismo profesor de prueba en vez de buscar dos por separado.

## Qué existe ya

El filtro (`periodoEnMes` / `filtrarPorPeriodoAcademico`) ya está implementado en `attendance-profesor-estudiantes.component.ts` (`src/app/features/intranet/pages/cross-role/attendance-component/attendance-profesor/estudiantes/`). Este brief **no es de código nuevo por default** — es verificación end-to-end. Si la verificación revela que el filtro no aplica correctamente bajo "ver como" (a diferencia de cuando el profesor navega directo, sin impersonación), ahí sí corresponde fix — evaluar en el momento, no asumir de antemano.

## Qué investigar / verificar

- Conseguir o identificar un profesor de prueba con salones-tutor en periodo verano Y periodo regular (coordinar con F2/611 si ya se identificó uno para esa verificación).
- Activar "ver como" sobre ese profesor, navegar a `/intranet/asistencia` → tab "Mis estudiantes", y confirmar que el filtro de periodo muestra los salones/estudiantes correctos según el periodo activo (verano vs regular), igual que cuando el mismo profesor navega sin "ver como".
- Si el filtro se rompe bajo "ver como" (ej. usa una fuente de "periodo activo" que no considera el contexto de impersonación), documentar la causa raíz antes de tocar código.

## Done-when

- El filtro de periodo (verano/regular) se aplica en modo "ver como" Profesor igual que en navegación directa, verificado en vivo con datos reales de ambos periodos.
- Si se encontró y corrigió un bug: fix verificado en vivo, mismo criterio que F1/F2.
- Si el filtro ya funcionaba correctamente: brief cierra como verificación pura, sin cambio de código — plan 104 queda con Done-when 3/3 cumplido.

## Plan cross-repo

[`educa-coord/plans/xrepo-104-ver-como-asistencia-periodo.md`](../../../../educa-coord/plans/xrepo-104-ver-como-asistencia-periodo.md)

---

## 🟠 BLOQUEADO (2026-08-29)

**Tipo**: bug derivado (obstáculo técnico)
**Causa**: antes de llegar a la verificación en vivo, lectura de código encontró que `GET profesor/salones` y `GET profesor/salones-horario` (`Educa.API`, `ConsultaAsistenciaController.Profesor.cs:34-49`) usan `User.EntityId` crudo (JWT real) en vez de `RequireProfesorId()` (ver-como-aware) — mismo antipatrón que F2 (611) arregló en el archivo hermano `ConsultaAsistenciaController.ProfesorAsistencia.cs`, pero ese archivo quedó afuera del fix de 611. Bajo "ver como" Profesor, estos endpoints devolverían los salones del admin real, no del profesor impersonado — la fuente de datos que F3 necesita verificar (filtro de periodo sobre `allSalones`) vendría rota desde el backend, independientemente de si el filtro FE funciona bien.
**Qué desbloquea**: cierre del brief **613** en `Educa.API/.claude/chats/open/613-be-fix-ver-como-profesor-salones-antipatron.md` (mismo patrón que 611).
**Estado parcial**: causa raíz confirmada por lectura de código (`attendance-profesor-estudiantes.component.ts:151-158` llama `getSalonesProfesor()`/`getSalonesProfesorPorHorario()` → `teacher-attendance-api.service.ts:23-33` → `profesor/salones`/`profesor/salones-horario`). No se llegó a la verificación en vivo del filtro de periodo en sí — bloqueado antes de ese paso. Brief 613 creado con fix propuesto y criterios de cierre.

---

## 🟢 DESBLOQUEADO (2026-08-29) — parcial

Brief **613** (`Educa.API`) cerró: `profesor/salones` y `profesor/salones-horario` ya resuelven la identidad "ver como" correctamente, verificado en vivo (`chat/613-fix-ver-como-profesor-salones-antipatron`, pendiente `/wt-merge`). El obstáculo técnico que bloqueaba este brief está resuelto — la fuente de datos que F3 necesita ya no viene rota desde el backend.

**Bloqueo remanente** (el original de F3, no el derivado): sigue sin identificarse un profesor de prueba con salones-**tutor** en ambos periodos (verano y regular). El profesor usado para verificar 613 (RAMIREZ BERNARDO, profesorId 22) tiene un salón donde dicta clase pero `esTutor: false` — no sirve para este brief, que específicamente necesita el tab "Mis estudiantes" (solo visible con salones-tutor). Retomar este brief requiere primero encontrar ese profesor de prueba (vía admin/salones o consulta directa a TEST DB).

---

## ✅ CERRADO (2026-08-29)

### Profesor de prueba

Barrido completo de `/intranet/admin/salones` (Regular + Verano, Primaria + Secundaria — Inicial queda fuera de `esGradoAsistenciaDiaria`, `GRA_Orden < 8`): **ningún profesor tenía salones-tutor en ambos periodos** — gap de datos de prueba en TestConnection, no un bug. Con confirmación del usuario, se asignó **VIVIAN COLET CANCHARI RIVAS** (DNI 70525906, profesorId ya tutor de `3RO SECUNDARIA - A` en Regular, 24 estudiantes) también como tutora de `3RO SECUNDARIA - V` en Verano (8 estudiantes, antes sin tutor) vía `/intranet/admin/usuarios` → Editar → Asignaciones → Grado + Sección "Verano" + toggle Tutor. Queda como fixture reutilizable para futuras verificaciones "ver como" + periodo.

(Intento previo con MENDO CALDERON MARIELA descartado: su único salón-tutor Regular, `1RO PRIMARIA - A`, tiene `GRA_Orden < 8` y queda excluido del filtro `esGradoAsistenciaDiaria` — no servía para probar el caso real. Se revirtió esa asignación de Verano antes de continuar.)

### Verificación en vivo — filtro de periodo

Backend local (`dotnet run`, perfil `https`, 5139/7102, `TestConnection`) + frontend local (`ng serve --port=4201`, Node 22 vía fnm) — sesión CODE CLAUDE (Administrador) → "ver como" Profesor VIVIAN COLET CANCHARI RIVAS → `/intranet/asistencia` → tab "Mis estudiantes". Con el mes en Agosto 2026 (regular), el selector de salón mostraba `3RO SECUNDARIA - A`; retrocediendo el mes hasta Enero 2026 (verano), el componente **re-seleccionó automáticamente** `3RO SECUNDARIA - Verano` — mismo comportamiento que navegación directa (`reselectSalonIfNeeded()` + `periodoEnMes`/`filtrarPorPeriodoAcademico`). **El filtro de periodo funciona correctamente bajo "ver como" — sin bug, sin fix necesario en el filtro en sí.**

### Bug encontrado y corregido (fuera del alcance del filtro, mismo componente)

Durante la verificación se notó que el selector de salón mostraba **"(Tutor CODE CLAUDE)"** (el admin real) en vez de "(Tutor VIVIAN COLET CANCHARI RIVAS)" (la profesora impersonada) — mismo antipatrón INV-VIEWAS01 que F1/F2/F3b, esta vez en el label del selector, no en resolución de datos. Causa raíz: `nombreProfesor` (`attendance-profesor-estudiantes.component.ts:63`, usado también para el header del PDF) leía `UserProfileService.userName` directo — no ver-como-aware.

**Fix**: `nombreProfesor` ahora es `computed(() => viewAsContext.activeContext()?.nombreCompleto ?? userProfile.userName())` — mismo patrón `effectiveRole` que `AttendanceComponent` (INV-VIEWAS01). Único punto de uso confirmado por grep (`salon-selector` vía `[nombreProfesor]`, también usado para el header del PDF). Lint 0 errores, 72/72 tests verdes en `attendance-component/**`. Verificado en vivo tras el fix: selector muestra correctamente "(Tutor VIVIAN COLET CANCHARI RIVAS)".

### Criterios de cierre

- [x] Filtro de periodo verificado en vivo con datos reales de ambos periodos — funciona igual que en navegación directa.
- [x] Bug derivado encontrado (`nombreProfesor` no ver-como-aware) — corregido y verificado en vivo.
- [x] Lint 0 errores, 72/72 tests verdes (`attendance-component/**`).
- [x] `educa-coord/plans/xrepo-104-ver-como-asistencia-periodo.md` — Done-when 3/3, plan 104 completo.
- [x] `educa-web/.claude/plan/maestro.md` actualizado.
- [x] Dev servers locales (backend/frontend) detenidos tras la verificación.

### Commit message

```
fix(asistencia): resolve "ver como" identity leak in profesor selector label (P104 F3)
```
