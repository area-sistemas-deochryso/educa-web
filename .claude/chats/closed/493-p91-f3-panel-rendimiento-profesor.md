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

## Cierre (2026-07-27)

Implementado en modo `/execute`, sin scope creep respecto al brief.

**Qué se hizo:**
- DTOs mirror del contrato de brief 494 (`ReporteRendimientoEstudiantesDto`, `RendimientoEstudianteDto`, `RendimientoPeriodoEstudianteDto`) en `src/app/data/models/rendimiento.models.ts` — no en `profesor/final-classrooms/models/` como se esperaba inicialmente (ver drift abajo).
- `TeacherFinalClassroomsApiService.getRendimientoEstudiantes(cursoContenidoId)` → `GET /api/reportesrendimiento/curso/{id}/estudiantes`.
- Estado agregado a `TeacherFinalClassroomsStore`/`TeacherFinalClassroomsFacade` (mismo patrón que `salonNotas`/`salonHorarios`): `salonRendimiento`, `rendimientoLoading`, `rendimientoError`, con reset en `closeSalonDialog()`.
- Nuevo tab "Rendimiento" (`ClassroomRendimientoTabComponent`, en `admin/classrooms/components/salon-rendimiento-tab/` junto a los demás tabs del diálogo compartido) — selector de curso (reusa `horarios` del salón, mismo mecanismo que el tab Notas) + tabla por estudiante con promedio y ambos outliers (`vs. período`, `vs. año`) por período, coloreados (verde=mejora, rojo=caída), más badge "N en riesgo" y ícono de alerta por fila.
- El tab es **opt-in**: `ClassroomDetailDialogComponent` recibe `showRendimiento` (default `false`). Solo `TeacherFinalClassroomsComponent` lo activa (`[showRendimiento]="true"`); `SalonesAdminComponent` (F2, admin) no lo pasa → comportamiento de admin sin cambios, panel admin no tocado.
- Specs agregados a `profesor-final-salones.store.spec.ts` y `profesor-final-salones.facade.spec.ts` cubriendo el nuevo estado/comando.

**Drift encontrado vs. brief:**
- El brief no anticipaba que `admin/` no puede importar de `profesor/` (regla `layer-enforcement/imports-error`, distinta del warn que sí permite `profesor/` → `admin/`). Como el diálogo compartido vive en `admin/classrooms/components/` y necesitaba los DTOs de rendimiento, se movieron a `@data/models/rendimiento.models.ts` (capa neutral, mismo lugar que `HorarioResponseDto`/`SalonNotasResumenDto`). `profesor/final-classrooms/models/rendimiento-estudiantes.models.ts` quedó como re-export, siguiendo el mismo criterio que ya usa `profesor-final-salones.interface.ts`.

**Decisiones de diseño no cubiertas por el brief:**
- **cursoContenidoId**: no hay selector explícito de "curso" en el flujo de Cerrar Periodo — se reusó `HorarioResponseDto.cursoId` (ya cargado por `loadHorariosSalon` y usado igual por el tab Notas vía `getNotasSalon(salonId, cursoId)`) como el `cursoContenidoId` a pasar al nuevo endpoint. Es el mismo ID, mismo mecanismo, mismo patrón UI que Notas.
- **Umbral de "en riesgo"**: se definió como "el período más reciente del estudiante tiene `outlierVsPeriodoAnterior < 0` o `outlierVsAnioAnterior < 0`" (cualquier caída respecto a su propia línea base). El brief no especifica un umbral numérico.
- **Integración física**: se agregó como 5º tab del `ClassroomDetailDialogComponent` ya usado por `TeacherFinalClassroomsComponent` al abrir un salón (mismo diálogo del flujo de Cerrar Periodo), en vez de una vista/dialog nueva independiente — minimiza componentes nuevos y reusa el selector de curso ya resuelto por el tab Notas.

**Lint / build:** `npm run lint` → 0 errores. `npm run build` → OK (incluye prerender SSR). `vitest run` sobre `profesor/final-classrooms` → 18/18 tests OK (incluye los 3 nuevos).

**Pendiente fuera de este chat:** actualizar `educa-coord/plans/xrepo-91-dashboard-rendimiento-multirol.md` marcando F3 shipped y cerrar brief 488 — vive en `educa-coord`, no en este worktree.
