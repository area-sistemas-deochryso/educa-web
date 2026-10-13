import type { ConfiguracionCalificacionListDto } from '@data/models';

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
	cursoId?: number | null;
	cursoContenidoId: number;
	cursoNombre: string;
	anio: number;
	periodos: RendimientoPeriodoEstudianteDto[];
	sinPeriodosConfigurados: boolean;
}

export interface ReporteRendimientoPropioDto {
	cursos: RendimientoPropioCursoDto[];
}

/** Curso de Mi Rendimiento con la escala (INV-U06) resuelta desde `mis-notas`; `null` → presentación numérica. */
export interface RendimientoCursoVm extends RendimientoPropioCursoDto {
	escala: ConfiguracionCalificacionListDto | null;
	/** Periodos con promedio: el gráfico de línea necesita al menos 2. */
	puntosCalificados: number;
}
