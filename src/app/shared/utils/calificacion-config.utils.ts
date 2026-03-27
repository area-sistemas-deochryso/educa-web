import type {
	ConfiguracionCalificacionListDto,
	ConfiguracionLiteralDto,
} from '@data/models';
import {
	createGradeScale,
	LiteralScale,
	type GradeClassification,
} from '@data/adapters';

// #region Tipos
export type { GradeClassification as NotaClasificacion } from '@data/adapters';
// #endregion

// #region Funciones puras de clasificacion
/**
 * Clasifica una nota segun la configuracion del nivel.
 * Si config es null, usa defaults historicos (14/11).
 *
 * Delega al GradeScaleAdapter correspondiente (vigesimal o literal).
 */
export function clasificarNota(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null = null,
): GradeClassification {
	if (nota === null || nota === undefined) {
		return { severity: 'secondary', cssClass: '', label: '-', esAprobatoria: false };
	}

	const scale = createGradeScale(config);
	return scale.classify(nota);
}

/**
 * Severity de PrimeNG para una nota.
 */
export function getNotaSeverity(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null = null,
): GradeClassification['severity'] {
	return clasificarNota(nota, config).severity;
}

/**
 * Clase CSS para una nota ('grade-green' | 'grade-red' | '').
 */
export function getGradeClass(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null = null,
): string {
	return clasificarNota(nota, config).cssClass;
}

/**
 * Determina si una nota es aprobatoria segun la configuracion.
 */
export function isNotaAprobada(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null = null,
): boolean {
	return clasificarNota(nota, config).esAprobatoria;
}

/**
 * Convierte una nota numerica a su equivalente literal (AD, A, B, C).
 * Retorna null si el tipo no es LITERAL o no hay config.
 */
export function convertToLiteral(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null,
): ConfiguracionLiteralDto | null {
	if (nota === null || nota === undefined) return null;
	if (config?.tipoCalificacion !== 'LITERAL' || config.literales.length === 0) return null;

	const scale = createGradeScale(config) as LiteralScale;
	return scale.findLiteral(nota);
}

/**
 * Formatea una nota segun el tipo de calificacion.
 * NUMERICO: "14.5", LITERAL: "A"
 */
export function formatNotaConConfig(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null = null,
): string {
	if (nota === null || nota === undefined) return '-';

	const scale = createGradeScale(config);
	return scale.format(nota);
}
// #endregion
