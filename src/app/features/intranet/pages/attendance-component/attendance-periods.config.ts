/**
 * Período académico (bimestre) del calendario escolar.
 * Los colegios dividen el año académico en 4 bimestres entre marzo y diciembre.
 * Enero y febrero son períodos vacacionales donde NO se cuentan inasistencias.
 */
export interface PeriodoAcademico {
	/** Número del bimestre (1-4) */
	bimestre: number;
	/** Nombre descriptivo del período */
	nombre: string;
	/** Mes de inicio (1-12) */
	mesInicio: number;
	/** Mes de fin (1-12) */
	mesFin: number;
}

/**
 * Períodos académicos del año escolar (marzo a diciembre).
 * Las inasistencias solo se cuentan durante estos períodos.
 */
export const PERIODOS_ACADEMICOS: PeriodoAcademico[] = [
	{
		bimestre: 1,
		nombre: 'Primer Bimestre',
		mesInicio: 3, // Marzo
		mesFin: 4, // Abril
	},
	{
		bimestre: 2,
		nombre: 'Segundo Bimestre',
		mesInicio: 5, // Mayo
		mesFin: 6, // Junio
	},
	{
		bimestre: 3,
		nombre: 'Tercer Bimestre',
		mesInicio: 8, // Agosto
		mesFin: 9, // Septiembre
	},
	{
		bimestre: 4,
		nombre: 'Cuarto Bimestre',
		mesInicio: 10, // Octubre
		mesFin: 12, // Diciembre
	},
];

/**
 * Meses del período vacacional donde NO se cuentan inasistencias.
 * Incluye:
 * - Enero y febrero: Vacaciones de verano
 * - Julio: Vacaciones de medio año
 */
export const MESES_VACACIONALES = [1, 2, 7]; // Enero, Febrero, Julio

/**
 * Determina si un mes corresponde a un período vacacional.
 * Durante períodos vacacionales NO se cuentan inasistencias (N).
 *
 * @param month Mes (1-12)
 * @returns true si es período vacacional (enero, febrero o julio)
 */
export function isPeriodoVacacional(month: number): boolean {
	return MESES_VACACIONALES.includes(month);
}

/**
 * Determina si un mes corresponde a un período académico.
 * Solo durante períodos académicos se cuentan las inasistencias (N).
 *
 * @param month Mes (1-12)
 * @returns true si es período académico (marzo-abril, mayo-junio, agosto-septiembre, octubre-diciembre)
 */
export function isPeriodoAcademico(month: number): boolean {
	return !isPeriodoVacacional(month);
}

/**
 * Obtiene el bimestre académico para un mes dado.
 *
 * @param month Mes (1-12)
 * @returns Número de bimestre (1-4) o null si es período vacacional
 */
export function getBimestre(month: number): number | null {
	const periodo = PERIODOS_ACADEMICOS.find(
		(p) => month >= p.mesInicio && month <= p.mesFin,
	);
	return periodo ? periodo.bimestre : null;
}

/**
 * Obtiene el nombre del período académico para un mes dado.
 *
 * @param month Mes (1-12)
 * @returns Nombre del período o "Período Vacacional"
 */
export function getNombrePeriodo(month: number): string {
	if (isPeriodoVacacional(month)) {
		if (month === 7) return 'Vacaciones de Medio Año';
		return 'Vacaciones de Verano';
	}

	const periodo = PERIODOS_ACADEMICOS.find(
		(p) => month >= p.mesInicio && month <= p.mesFin,
	);
	return periodo ? periodo.nombre : 'Período Desconocido';
}

/**
 * Determina si una fecha debe contar como inasistencia potencial.
 * Las inasistencias (N) solo se cuentan durante períodos académicos (marzo-diciembre, excepto julio).
 * Durante períodos vacacionales (enero, febrero, julio) NO se marca como inasistencia.
 *
 * @param date Fecha a evaluar
 * @returns true si debe contarse la inasistencia (período académico)
 */
export function shouldCountInasistencia(date: Date): boolean {
	const month = date.getMonth() + 1; // getMonth() retorna 0-11
	return isPeriodoAcademico(month);
}
