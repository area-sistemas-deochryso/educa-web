// DTOs de `GET /api/reportesrendimiento/institucional` (Educa.API, brief 492).
// Mismo `RendimientoPeriodoDto` que consumen F1 (curso) y F4 (`mi-rendimiento`, ver
// `estudiante-rendimiento.models.ts`) — acá llega uno por curso-contenido de toda la
// institución en una sola lista, sin pre-filtrar por outlier (eso se resuelve en el FE).

export interface RendimientoPeriodoDto {
	periodoId: number;
	periodoNombre: string;
	periodoOrden: number;
	promedioCurso: number | null;
	totalEstudiantesConNota: number;
	outlierVsPeriodoAnterior: number | null;
	outlierVsAnioAnterior: number | null;
}

export interface ReporteRendimientoDto {
	cursoContenidoId: number;
	cursoNombre: string;
	salonDescripcion: string;
	periodos: RendimientoPeriodoDto[];
}

// #region Ordenamiento por outlier
/**
 * "Score" de desvío de un curso: la mayor magnitud absoluta entre todos los
 * `outlierVsPeriodoAnterior`/`outlierVsAnioAnterior` no nulos de sus períodos.
 * Positivo o negativo da igual acá — lo que importa para priorizar es cuánto se
 * desvió, no la dirección (eso se muestra aparte en la UI).
 */
export function outlierScore(curso: ReporteRendimientoDto): number {
	let max = 0;
	for (const periodo of curso.periodos) {
		if (periodo.outlierVsPeriodoAnterior !== null) {
			max = Math.max(max, Math.abs(periodo.outlierVsPeriodoAnterior));
		}
		if (periodo.outlierVsAnioAnterior !== null) {
			max = Math.max(max, Math.abs(periodo.outlierVsAnioAnterior));
		}
	}
	return max;
}

/** `true` si el curso tiene al menos un período con desvío registrado (score > 0). */
export function tieneOutlier(curso: ReporteRendimientoDto): boolean {
	return outlierScore(curso) > 0;
}

/** Cursos ordenados de mayor a menor desvío — el que más se alejó de su línea base va primero. */
export function ordenarPorOutlier(cursos: ReporteRendimientoDto[]): ReporteRendimientoDto[] {
	return [...cursos].sort((a, b) => outlierScore(b) - outlierScore(a));
}
// #endregion

// #region KPIs agregados del panel
export interface AdminRendimientoKpis {
	totalCursos: number;
	cursosConOutlier: number;
	promedioInstitucional: number | null;
}

export function calcularKpis(cursos: ReporteRendimientoDto[]): AdminRendimientoKpis {
	const promedios: number[] = [];
	let cursosConOutlier = 0;

	for (const curso of cursos) {
		if (tieneOutlier(curso)) cursosConOutlier += 1;

		const ultimoPeriodo = curso.periodos.at(-1);
		if (ultimoPeriodo?.promedioCurso !== null && ultimoPeriodo?.promedioCurso !== undefined) {
			promedios.push(ultimoPeriodo.promedioCurso);
		}
	}

	const promedioInstitucional =
		promedios.length === 0 ? null : promedios.reduce((acc, p) => acc + p, 0) / promedios.length;

	return { totalCursos: cursos.length, cursosConOutlier, promedioInstitucional };
}
// #endregion
