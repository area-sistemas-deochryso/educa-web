# 493 — P91 F3: panel de rendimiento Profesor

> **Coord ref**: `educa-coord/chats/running/488-p91-f3-panel-rendimiento-profesor.md`
> **Plan**: `educa-coord/plans/xrepo-91-dashboard-rendimiento-multirol.md`
> **Creado**: 2026-07-27
> **MODO SUGERIDO**: `/execute`
> **exclusive**: false
> **touches**: vista de rendimiento por estudiante para el profesor + extensión del diálogo de Cerrar Periodo

## Scope

- Vista a **nivel de estudiante individual** dentro de los cursos/salones asignados al profesor autenticado (no solo promedio agregado de curso) — con tendencia por estudiante y resaltado de quién se desvió de su propia línea base.
- Consume el contrato de F1 (`GET /api/reportesrendimiento/curso/{id}`, capability `REPORTES_RENDIMIENTO`), filtro de alcance resuelto server-side (no client-side).
- **Integrar cerca del flujo de Cerrar Periodo**: el diálogo de cierre de período (`ClosePeriodDialogComponent`, en `features/intranet/pages/admin/classrooms/`) ya recibe un objeto de estadísticas como input — extender ese contrato para sumar el resumen de riesgo por estudiante, en vez de crear una superficie de acceso nueva y aislada.

## Pre-work

- Revisar `ClosePeriodDialogComponent` y `salones-admin.component` para entender el input `estadisticas` actual antes de extenderlo.
- Revisar el DTO de F1 (`ReporteRendimientoDto`) devuelto por el endpoint de curso.

## Out of scope

- Cálculo de agregación/outlier (vive en backend, ya cerrado en F1/F1b).
- Panel Admin (F2) y Panel Estudiante (F4) — fases hermanas, sin dependencia.

## Criterio de cierre

- [ ] FE: lint + build OK, comportamiento verificado.
- [ ] El panel muestra rendimiento por estudiante individual, no solo agregado de curso.
- [ ] El resumen de riesgo es visible desde/cerca del flujo de Cerrar Periodo.
- [ ] `educa-coord/`: plan P91 actualizado marcando F3 como shipped, brief 488 cerrado.

## Tiempo estimado

~N min.
