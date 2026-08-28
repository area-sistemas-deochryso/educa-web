> **Repo destino**: `educa-web` (frontend, branch `main`) — confirmado en investigación: F1 solo `educa-web`; el hallazgo BE derivado (F2, `Educa.API`) queda documentado en el plan cross-repo para un chat futuro.
> **Plan**: 104 (coord) · **Fase**: F1 · **Creado**: 2026-08-21 · **Estado**: ✅ cerrado 2026-08-28 (worktree `chat/578-fix-ver-como-asistencia-periodo`).
> **Validación prod**: ⏳ pendiente desde 2026-08-28.

---

# 578 — Fix: "ver como" en Asistencia no respeta el contexto ni discrimina por periodo

## Contexto

Mismo antipatrón que [P97](../../../../educa-coord/plans/xrepo-97-verificacion-identidad-ver-como.md) — código que no considera el contexto "ver como" activo (P92). `INV-VIEWAS01` (`.claude/rules/business-rules.md`) documenta el checklist aplicable; validar contra él al confirmar causa raíz. Reportado por el usuario 2026-08-20 durante uso real.

## Hallazgos a corregir

1. En `/intranet/asistencia`, el modo "ver como" no se respeta correctamente: el admin no debería ver la página como si fuera el rol impersonado — debe cargar en modo admin.
2. El modo "ver como" no discrimina por periodo (verano / regular) como sí hacen el resto de páginas.

## Qué investigar

- Punto 1: comparar `/intranet/asistencia` contra el patrón ya correcto en Horario/Notas (`ResolveViewAsIdentity()` server-side, o el filtro FE equivalente) para ver dónde se pierde el contexto.
- Punto 2: identificar cómo las demás páginas resuelven el periodo activo (verano/regular) y por qué Asistencia bajo "ver como" no aplica el mismo filtro.

## Done-when

- ✅ `/intranet/asistencia` bajo "ver como" carga el contenido del rol impersonado (dirección confirmada con el usuario 2026-08-28, ver sección de investigación), verificado en vivo.
- ⏳ El filtro de periodo (verano/regular) se aplica en modo "ver como" igual que en el resto de páginas — **diferido**, ver `## Decisión de cierre (2026-08-28)` abajo.

## Plan cross-repo

[`educa-coord/plans/xrepo-104-ver-como-asistencia-periodo.md`](../../../../educa-coord/plans/xrepo-104-ver-como-asistencia-periodo.md)

## Investigación (2026-08-28)

**Worktree**: `chat/578-fix-ver-como-asistencia-periodo` — `EducaWeb/WT/educa-web/578-fix-ver-como-asistencia-periodo`.

### Causa raíz — Hallazgo 1

`/intranet/asistencia` es ruta cross-role (`intranet.routes.ts:297`, `AttendanceComponent`), **no** wrappeada con `viewAsGateGuard`/`withViewAsGate` como sí lo están `profesor/*`/`estudiante/*` — está deliberadamente en `ViewAsContextService.SHARED_ROUTES` (brief 510/537) para permanecer alcanzable durante "ver como" sin perder los headers del `view-as.interceptor`.

`AttendanceComponent` elegía el sub-componente por rol vía `@switch (userRole())`, donde `userRole = userProfile.userRole` — el rol **real** de sesión (`user-profile.service.ts`), nunca tocado por ver-como. Resultado: un admin impersonando a un estudiante seguía renderizando `AttendanceDirectorComponent` (panel admin completo), mientras que `IntranetLayoutComponent` sí resuelve correctamente `effectiveRol = viewAsContext.activeContext()?.rol ?? authService.currentUser?.rol` para banner/nav/breadcrumb (patrón P92 F2) — de ahí el desync reproducido en prod (nav/breadcrumb "Estudiante", contenido = panel admin).

**Ambigüedad resuelta con el usuario**: el texto original del brief ("no debería ver la página como si fuera el rol impersonado") se leía como pedir el comportamiento opuesto. Confirmado 2026-08-28: la dirección correcta es que el contenido siga al rol impersonado (mismo patrón que nav/breadcrumb/menú), no al revés.

**Fix aplicado** (`attendance.component.ts` + `.html`):
- Nuevo `effectiveRole = computed(() => viewAsContext.activeContext()?.rol ?? userRole())`, mismo patrón que `IntranetLayoutComponent.effectiveRol`.
- `@switch (effectiveRole())` en el template (antes `userRole()`).
- `showModeSelector`, `onModeChange`, `onReload` actualizados: el chequeo `userProfile.rol()?.esStaff` (panel director) solo aplica cuando **no** hay ver-como activo (`!isViewingAs()`) — si no, un admin impersonando a un estudiante seguía viendo el selector día/mes del panel director pese a estar en la vista de estudiante.
- Tests nuevos en `attendance.component.spec.ts` (describe `"ver como" (effectiveRole)"`) cubriendo: fallback sin contexto activo, override con contexto activo, `showModeSelector` en false mientras se impersona pese a `esStaff: true`, y delegación de `onReload` al sub-componente correcto.

### Causa raíz — Hallazgo 2 (hipótesis, sin verificar en vivo)

El filtro de periodo (verano/regular) para "mis estudiantes" del profesor vive en `attendance-profesor-estudiantes.component.ts` (`periodoEnMes` + `filtrarPorPeriodoAcademico` de `@shared/models`), **dentro** de `AttendanceProfesorComponent`. Ese componente nunca se montaba bajo "ver como" por el mismo bug del Hallazgo 1 (siempre se montaba `AttendanceDirectorComponent` en su lugar) — por lo que el filtro de periodo simplemente nunca se ejecutaba en el flujo de ver-como. Hipótesis: el fix del Hallazgo 1 resuelve el Hallazgo 2 como efecto colateral (al montar el componente correcto, su filtro de periodo ya integrado se aplica). `AttendanceEstudianteComponent` no tiene lógica de periodo propia — consistente con que el scoping de "mi asistencia" ya lo resuelve el backend por matrícula activa, sin filtro FE.

**Pendiente de verificar en vivo** (no reproducible sin sesión admin real + datos de ambos periodos): confirmar que "ver como" Profesor bajo `/intranet/asistencia` filtra correctamente por periodo tras el fix.

### Validación local corrida

- `npm ci` en el worktree (node_modules no se comparte entre worktrees).
- `eslint` sobre `attendance.component.ts` y `.spec.ts` — limpio.
- `tsc --noEmit` sobre `attendance.component.ts` — limpio (errores preexistentes no relacionados en otros specs del proyecto, confirmados fuera de este diff).
- `vitest run attendance.component.spec.ts` — 12/12 verdes (8 preexistentes + 4 nuevos).

### Verificación en vivo (2026-08-28, local: `ng serve` con Node 22 vía `fnm`, backend local `localhost:5139`, sesión guardada "CODE CLAUDE" / Administrador)

**Hallazgo 1 — CONFIRMADO arreglado**:
- "Ver como" Estudiante (ALBINES MENDIETA JEREMY) → `/intranet/asistencia` renderiza `AttendanceEstudianteComponent` ("Asistencias" + leyenda A/T/F/J), nav dice "Estudiante", breadcrumb "Estudiante › Mi Seguimiento › Historial de Asistencia" — coherente en las 3 capas (antes: contenido mostraba el panel admin completo pese a nav/breadcrumb "Estudiante").
- "Ver como" Profesor (RAMIREZ BERNARDO JOSE DANIEL) → `/intranet/asistencia` renderiza `AttendanceProfesorComponent` (tab "Mi asistencia"), nav "Profesor", breadcrumb "Profesor › Mi Seguimiento › Historial de Asistencia" — mismo patrón, correcto.

**Bug nuevo encontrado (bloqueante, requiere `Educa.API`)**: bajo "ver como" Profesor, el tab "Mi asistencia" dispara `GET /api/ConsultaAsistencia/profesor/me/mes?mes=8&anio=2026` → **404 "No se encontró el profesor solicitado"** (reproducido 3x, navegación limpia cada vez). El endpoint no resuelve el profesor impersonado — probablemente no usa `ResolveViewAsIdentity()` (mismo patrón INV-VIEWAS01 que P97), a diferencia del endpoint equivalente de Estudiante que sí funcionó sin error. Este bug estaba invisible hasta ahora porque el bug de Hallazgo 1 nunca dejaba montar `AttendanceProfesorComponent` bajo ver-como — sus llamadas HTTP nunca se disparaban.

**Hallazgo 2 (periodo verano/regular) — sin verificar end-to-end**: el profesor de prueba disponible (RAMIREZ BERNARDO) no tiene tab "Mis estudiantes" (sin salones como tutor asignados en el periodo actual), así que no se pudo ejercitar en vivo el filtro `periodoEnMes`/`filtrarPorPeriodoAcademico` de `attendance-profesor-estudiantes.component.ts` bajo ver-como. Ese filtro ya existe en el componente y ahora es alcanzable gracias al fix de Hallazgo 1 (antes nunca se montaba); falta confirmar con un profesor real que tenga salones en ambos periodos.

## Decisión de cierre (2026-08-28)

Confirmado con el usuario: 578 cierra con el fix de Hallazgo 1 (único ítem realmente en scope de `educa-web`). Los dos hallazgos restantes quedan documentados en `educa-coord/plans/xrepo-104-ver-como-asistencia-periodo.md` como F2/F3 para retomar en un chat futuro (F2 en `Educa.API`, repo distinto — no se toca desde acá por `one-repo-one-chat`):

- **F2 (Educa.API, sin brief)**: `ConsultaAsistencia/profesor/me/mes` devuelve 404 bajo "ver como" Profesor.
- **F3 (`educa-web`, sin brief, bloqueado por F2)**: filtro de periodo verano/regular sin verificar end-to-end — necesita un profesor de prueba con salones-tutor en ambos periodos, probablemente el mismo que se use para validar F2.

P104 en `educa-coord/plans/maestro.md` actualizado para reflejar F1 ✅ / F2 🆕 / F3 ⏳.
