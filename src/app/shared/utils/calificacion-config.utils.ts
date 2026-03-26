import type {
	ConfiguracionCalificacionListDto,
	ConfiguracionLiteralDto,
} from '@data/models';

// #region Tipos
type PrimeNgSeverity = 'success' | 'warn' | 'danger' | 'secondary';

export interface NotaClasificacion {
	severity: PrimeNgSeverity;
	cssClass: 'grade-green' | 'grade-yellow' | 'grade-red' | '';
	label: string;
	esAprobatoria: boolean;
}

/** Defaults cuando no hay config cargada (compatibilidad con umbrales historicos) */
const DEFAULTS = {
	notaMinAprobatoria: 11,
	notaExcelente: 14,
} as const;
// #endregion

// #region Funciones puras de clasificacion
/**
 * Clasifica una nota segun la configuracion del nivel.
 * Si config es null, usa defaults historicos (14/11).
 *
 * Funcion pura — importable directamente en componentes presentacionales
 * sin necesidad de inyeccion de dependencias.
 */
export function clasificarNota(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null = null,
): NotaClasificacion {
	if (nota === null || nota === undefined) {
		return { severity: 'secondary', cssClass: '', label: '-', esAprobatoria: false };
	}

	if (config?.tipoCalificacion === 'LITERAL' && config.literales.length > 0) {
		return clasificarNotaLiteral(nota, config.literales);
	}

	return clasificarNotaNumerica(nota, config);
}

/**
 * Severity de PrimeNG para una nota.
 * Reemplaza los `getNotaSeverity()` hardcodeados en componentes.
 */
export function getNotaSeverity(
	nota: number | null,
	config: ConfiguracionCalificacionListDto | null = null,
): PrimeNgSeverity {
	return clasificarNota(nota, config).severity;
}

/**
 * Clase CSS para una nota ('grade-green' | 'grade-red' | '').
 * Reemplaza los `getGradeClass()` hardcodeados en componentes.
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

	const sorted = [...config.literales].sort((a, b) => a.orden - b.orden);
	for (const literal of sorted) {
		if (literal.notaMinima !== null && literal.notaMaxima !== null) {
			if (nota >= literal.notaMinima && nota <= literal.notaMaxima) {
				return literal;
			}
		}
	}
	return sorted[sorted.length - 1] ?? null;
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

	if (config?.tipoCalificacion === 'LITERAL' && config.literales.length > 0) {
		const literal = convertToLiteral(nota, config);
		return literal ? literal.letra : nota.toFixed(1);
	}

	return nota.toFixed(1);
}
// #endregion

// #region Helpers internos
function clasificarNotaNumerica(
	nota: number,
	config: ConfiguracionCalificacionListDto | null,
): NotaClasificacion {
	const minAprobatoria = config?.notaMinAprobatoria ?? DEFAULTS.notaMinAprobatoria;
	// "Excelente" es ~127% del minimo aprobatorio (14/11 ~ 1.27)
	const excelente = config?.notaMinAprobatoria
		? Math.round(config.notaMinAprobatoria * 1.27)
		: DEFAULTS.notaExcelente;

	if (nota >= excelente) {
		return { severity: 'success', cssClass: 'grade-green', label: 'Excelente', esAprobatoria: true };
	}
	if (nota >= minAprobatoria) {
		return { severity: 'warn', cssClass: 'grade-green', label: 'Aprobado', esAprobatoria: true };
	}
	return { severity: 'danger', cssClass: 'grade-red', label: 'Desaprobado', esAprobatoria: false };
}

function clasificarNotaLiteral(
	nota: number,
	literales: ConfiguracionLiteralDto[],
): NotaClasificacion {
	const sorted = [...literales].sort((a, b) => a.orden - b.orden);

	for (const literal of sorted) {
		if (literal.notaMinima !== null && literal.notaMaxima !== null) {
			if (nota >= literal.notaMinima && nota <= literal.notaMaxima) {
				return {
					severity: literal.esAprobatoria ? (literal.orden <= 1 ? 'success' : 'warn') : 'danger',
					cssClass: literal.esAprobatoria ? 'grade-green' : 'grade-red',
					label: `${literal.letra} - ${literal.descripcion}`,
					esAprobatoria: literal.esAprobatoria,
				};
			}
		}
	}

	return { severity: 'secondary', cssClass: '', label: '-', esAprobatoria: false };
}
// #endregion
