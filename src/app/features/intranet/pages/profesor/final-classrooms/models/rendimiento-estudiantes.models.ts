// Re-export de `@data/models` (fuente única de verdad) — contrato de
// `GET /api/reportesrendimiento/curso/{cursoContenidoId}/estudiantes` (brief 494).
// Vive en @data/models (no acá) porque también lo consume admin/classrooms
// (salon-detail-dialog, tab compartido) y layer-enforcement prohíbe que
// admin/ importe directo de profesor/.
export type {
	RendimientoPeriodoEstudianteDto,
	RendimientoEstudianteDto,
	ReporteRendimientoEstudiantesDto,
} from '@data/models';
