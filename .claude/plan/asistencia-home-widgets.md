# Plan 22 — Widgets de Asistencia del Día en /intranet

> ✅ **Rewritten to ADR-0006 D1 format** (2026-05-25). Contract only — no implementation detail.

> **Estado**: ✅ Diseño cerrado 2026-04-20. Listo para `/execute`.
> **Origen**: Plan 21 (Asistencia de Profesores en CrossChex) cerró el backend. Queda pendiente el resumen del día en el home (`/intranet`) para roles por encima de estudiante.
> **Capa**: Solo frontend, sin backend.

---

## Problem

En `/intranet`, roles administrativos y profesores ven un resumen de asistencia del día incompleto o vacío:
- Director/AsistenteAdmin/Promotor: solo ven estadísticas de estudiantes, no de profesores.
- Coordinador Académico: no ve nada (no está en el gate).
- Profesor no-tutor: ve un widget vacío (bug real).
- Profesor tutor: no ve su propia asistencia.

Backend ya expone todos los endpoints necesarios (Plan 21).

---

## Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Widget admin layout | Un card con dos secciones apiladas (Estudiantes + Profesores) siempre visibles | Toggle suma click sin valor; dos widgets separados desperdician espacio |
| Widget profesor layout | "Mi asistencia" arriba + "Mi salón" abajo (condicional a tutor) | El dato propio se busca primero; resuelve el bug del widget vacío para no-tutor |
| Gate ampliado | Agregar Coordinador Académico al `showAttendanceWidget` computed | Rol existente sin acceso al widget por omisión |
| Fetching strategy | forkJoin paralelo en el cliente, errores independientes por sección | Si una call falla, la otra sección sigue mostrando datos |
| Navigation on click | Mantener routerLinks existentes sin query params | Los destinos ya tienen navegación interna por sub-tipo |

---

## Phases

### Phase 1 — Implementación completa (1 chat)

1. Ampliar gate del home para incluir Coordinador Académico.
2. Reescribir widget admin con dos secciones (estudiantes + profesores) consumiendo ambos endpoints en paralelo.
3. Reescribir widget profesor con sección "Mi asistencia" + sección condicional "Mi salón".
4. Skeleton de loading que replica la estructura de 2 secciones.
5. Tests mínimos: gate para Coordinador Académico, widget con branch tutor/no-tutor.

---

## Done-when

- Director/AsistenteAdmin/Promotor/CoordinadorAcadémico ven estadísticas de estudiantes Y profesores en un solo card.
- Profesor tutor ve su asistencia propia + estadísticas de su salón.
- Profesor no-tutor ve su asistencia propia (no widget vacío).
- Error en una sección no bloquea la otra.
- Lint, build y tests verdes.

---

## Out of scope

- Estudiante / Apoderado (no tienen widget).
- Cambios en `/intranet/asistencia` (cerró Plan 21).
- Backend endpoints (ya implementados).

---

## Dependencies

- Plan 21 (backend endpoints ya desplegados).

## Invariants

- INV-AS04 (tutor pleno) — `esTutor` ya se expone en `SalonProfesor`.
