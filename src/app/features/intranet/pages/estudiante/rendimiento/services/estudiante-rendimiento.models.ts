// DTOs de `GET /api/reportesrendimiento/mi-rendimiento` (Educa.API, brief 489).
// Sin contraparte en profesor/models — F4 es el primer consumidor FE de la
// familia REPORTES_RENDIMIENTO (F1/F2/F3 solo tienen backend shipped).

export interface RendimientoPeriodoEstudianteDto {
	periodoId: number;
	periodoNombre: string;
	periodoOrden: number;
	promedio: number | null;
	outlierVsPeriodoAnterior: number | null;
	outlierVsAnioAnterior: number | null;
}

export interface RendimientoPropioCursoDto {
	cursoContenidoId: number;
	cursoNombre: string;
	anio: number;
	periodos: RendimientoPeriodoEstudianteDto[];
}

export interface ReporteRendimientoPropioDto {
	cursos: RendimientoPropioCursoDto[];
}
