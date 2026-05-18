# Brief 187 — Polish W21 · F1 audit visual 10 pages

<!-- minimal-from-go -->

> **Creado**: 2026-05-18 · **Estado**: ✅ F1 ejecutada, listo para `/end`.
> **Plan base**: [`plan/intranet-fe-polish-W21.md`](../../plan/intranet-fe-polish-W21.md) — Fase F1.
> **Modo sugerido**: `/investigate` (read-only audit).

## Resultado F1

Matriz `F1.Resultados` poblada en el plan paraguas. 5 tasks de bugs/hallazgos creadas:

- `polish-W21-tokens-colors.md` 🔴 — hex literales en 5 archivos (estudiante + cross-role + profesor/schedules debug).
- `polish-W21-aria-labels-estudiante.md` 🔴 — botones icon-only sin aria-label en estudiante/schedules+notas + profesor/grades.
- `polish-W21-skeletons-shared.md` 🔴 — spinners genéricos donde el design-system pide shared (5 pages).
- `polish-W21-appendto-calendars.md` 🟡 — 2 `p-calendar` sin `appendTo="body"` en attendance-summary-panel.
- `polish-W21-schedules-debug-panel.md` 🟡 — panel debug con hex en `profesor/schedules`.

**Lecturas globales**:

- 5/10 pages 🟢 globales (cursos+classrooms profesor/estudiante, final-classrooms, home).
- 5/10 pages 🟡 globales (schedules+grades del profesor, classrooms+schedules+notas del estudiante).
- 0/10 pages 🔴 globales — nada bloqueante.
- Patrón claro: las pages del rol estudiante drift más en tokens + skeletons + aria-labels que las del profesor.
- F3 confirmado prioritario: `profesor/grades` es monolito de 290 ln, candidato real a partir.

**Sin browser/Playwright**: la auditoría fue estática (5 agents Explore leyendo source code). Para detectar bugs de UX dinámica (loaders demasiado lentos, transiciones, focus traps) hay que volver a correr F1 con dev server arriba + Playwright MCP instalado.

## Next

- `/end` para cerrar este chat.
- F2 del plan W21 (`/design` para priorizar las 5 tasks en briefs ordenados) — chat separado.
- F3 (refactor `profesor/grades`) — chat separado.

## Objetivo

Producir la matriz `F1.Resultados` del plan W21 con auditoría visual de las 10 pages profesor/estudiante:

1. `profesor/cursos`
2. `profesor/classrooms`
3. `profesor/final-classrooms`
4. `profesor/schedules`
5. `profesor/grades`
6. `estudiante/cursos`
7. `estudiante/classrooms`
8. `estudiante/schedules`
9. `estudiante/notas`
10. `cross-role/home-component` (touchpoint compartido)

## Checklist por página (8 categorías)

- design-system B1-B11
- tokens de color (sin hex literal)
- `appendTo="body"` en selects/multiselects/calendars
- skeletons en secciones con datos de API
- `aria-label` vía `pt` en botones icon-only
- `p-dialog`/`p-drawer` fuera de `@if`
- estados loading/empty/error visibles y consistentes
- flujo cotidiano sin pasos redundantes

## Out-of-scope

- No tocar código (read-only).
- Bugs reales → tasks `polish-W21-*` aparte (no se arreglan acá).

## Done

- Matriz `F1.Resultados` poblada con 🔴/🟡/🟢/— por celda.
- Tasks de bugs descubiertos creadas en `.claude/tasks/pending/polish-W21-*`.
- Evidencias (screenshots/console) referenciadas en notas de matriz.

## Pre-work

- Dev server `npm run start` (`:4201`).
- Playwright MCP disponible (con fallback a audit de código estático si no).

## Plan base

[`plan/intranet-fe-polish-W21.md`](../../plan/intranet-fe-polish-W21.md)
