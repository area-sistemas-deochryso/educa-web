// DTOs de `GET /api/reportesrendimiento/curso/{cursoContenidoId}/estudiantes` (Educa.API, brief 494).
// Desglose de rendimiento por estudiante individual dentro de un cursoContenido —
// endpoint separado del agregado de F1 (`GET curso/{id}`). Vive en @data/models
// (capa neutral) porque lo consume tanto admin/ (salon-detail-dialog, tab
// compartido) como profesor/ (final-classrooms) — layer-enforcement prohíbe que
// admin/ importe directo de profesor/.

export interface RendimientoPeriodoEstudianteDto {
	periodoId: number;
	periodoNombre: string;
	periodoOrden: number;
	promedio: number | null;
	outlierVsPeriodoAnterior: number | null;
	outlierVsAnioAnterior: number | null;
}

export interface RendimientoEstudianteDto {
	estudianteId: number;
	estudianteNombre: string;
	periodos: RendimientoPeriodoEstudianteDto[];
}

export interface ReporteRendimientoEstudiantesDto {
	cursoContenidoId: number;
	cursoNombre: string;
	salonDescripcion: string;
	estudiantes: RendimientoEstudianteDto[];
}
