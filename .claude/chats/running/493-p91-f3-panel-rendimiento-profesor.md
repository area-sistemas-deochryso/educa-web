# 493 — P91 F3: panel de rendimiento Profesor

> **Coord ref**: `educa-coord/chats/running/488-p91-f3-panel-rendimiento-profesor.md`
> **Plan**: `educa-coord/plans/xrepo-91-dashboard-rendimiento-multirol.md`
> **Creado**: 2026-07-27 · **Estado**: ✅ desbloqueado 2026-07-27 — `Educa.API` brief 494 shipped, contrato real disponible.
> **MODO SUGERIDO**: `/execute`
> **exclusive**: false
> **touches**: vista de rendimiento por estudiante para el profesor + extensión del diálogo de Cerrar Periodo

## Bloqueo original (investigación 2026-07-27, sin código escrito) — resuelto

1. **Punto de integración incorrecto**: `ClosePeriodDialogComponent` es admin-only (`admin/salones`, capability `ADMIN_SALONES`). El profesor no tiene esa capability. Corregido en el plan xrepo-91 — el punto real es `TeacherFinalClassroomsComponent` (`profesor/final-salones`, capability `PROFESOR_FINAL_SALONES`).
2. **Contrato F1 insuficiente**: `ReporteRendimientoDto`/`RendimientoPeriodoDto` solo trae agregado a nivel de curso (`PromedioCurso`), sin desglose por estudiante — que F3 necesita. **Resuelto**: `Educa.API` brief 494 shipped 2026-07-27, contrato disponible abajo.

## Contrato real a consumir (brief 494, shipped 2026-07-27)

`GET /api/reportesrendimiento/curso/{cursoContenidoId}/estudiantes` (capability `REPORTES_RENDIMIENTO`, mismo scope de profesor server-side que F1) →

```
ReporteRendimientoEstudiantesDto {
  CursoContenidoId, CursoNombre, SalonDescripcion,
  Estudiantes: RendimientoEstudianteDto[] {
    EstudianteId, EstudianteNombre,
    Periodos: RendimientoPeriodoEstudianteDto[] {
      PeriodoId, PeriodoNombre, PeriodoOrden,
      Promedio,
      OutlierVsPeriodoAnterior,   // vs propio período anterior del estudiante
      OutlierVsAnioAnterior       // vs baseline institucional del año anterior
    }
  }
}
```

Es un **endpoint separado** del agregado de F1 (`GET curso/{id}`) — no una extensión de `RendimientoPeriodoDto`.

## Scope

- Vista a **nivel de estudiante individual** dentro de los cursos/salones asignados al profesor autenticado (no solo promedio agregado de curso) — con tendencia por estudiante y resaltado de quién se desvió de su propia línea base.
- Consume el contrato nuevo `GET /api/reportesrendimiento/curso/{id}/estudiantes` (brief 494) — no el de F1 agregado.
- **Integrar cerca del flujo de Cerrar Periodo**: el punto real es `TeacherFinalClassroomsComponent` (`profesor/final-salones`, capability `PROFESOR_FINAL_SALONES`), no `ClosePeriodDialogComponent` (admin-only) — ver corrección arriba.

## Pre-work

- Revisar `TeacherFinalClassroomsComponent` y `ClassroomDetailDialogComponent` (compartido con admin) para entender dónde encaja el resumen de riesgo por estudiante.
- Revisar el contrato real de `ReporteRendimientoEstudiantesDto` arriba.

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
