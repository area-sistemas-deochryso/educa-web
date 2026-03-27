// #region Imports
import type {
	ConfiguracionCalificacionListDto,
	ConfiguracionLiteralDto,
} from '@data/models';
// #endregion

// #region Tipos
type PrimeNgSeverity = 'success' | 'warn' | 'danger' | 'secondary';

export interface GradeClassification {
	severity: PrimeNgSeverity;
	cssClass: 'grade-green' | 'grade-yellow' | 'grade-red' | '';
	label: string;
	esAprobatoria: boolean;
}

/**
 * Contrato para adaptadores de escala de calificación.
 *
 * Cada escala define cómo clasificar, formatear y validar notas
 * dentro de sus propios límites y reglas.
 *
 * Hoy soportamos vigesimal (0-20) y literal (AD/A/B/C).
 * Si mañana se necesita centesimal (0-100) o percentil,
 * basta con implementar esta interfaz.
 */
export interface GradeScale {
	/** Nota mínima posible en esta escala */
	readonly min: number;
	/** Nota máxima posible en esta escala */
	readonly max: number;
	/** Nota mínima para aprobar */
	readonly passingGrade: number;

	/** Clasifica una nota (severity, label, aprobatoria) */
	classify(nota: number): GradeClassification;
	/** Formatea la nota para mostrar en UI */
	format(nota: number): string;
	/** Determina si una nota es aprobatoria */
	isAprobatoria(nota: number): boolean;
	/** Convierte una nota de esta escala a otra escala destino */
	convertTo(nota: number, targetScale: GradeScale): number;
}
// #endregion

// #region Defaults
/** Umbrales históricos del sistema vigesimal peruano */
const VIGESIMAL_DEFAULTS = {
	min: 0,
	max: 20,
	passingGrade: 11,
	excellentRatio: 1.27,
} as const;

const CENTESIMAL_DEFAULTS = {
	min: 0,
	max: 100,
	passingGrade: 55,
	excellentRatio: 1.27,
} as const;
// #endregion

// #region Escala Vigesimal (0-20)
/**
 * Escala vigesimal: sistema de calificación peruano estándar (0-20).
 *
 * Umbrales:
 * - Excelente: >= notaMinAprobatoria * 1.27 (default 14)
 * - Aprobado: >= notaMinAprobatoria (default 11)
 * - Desaprobado: < notaMinAprobatoria
 */
export class VigesimalScale implements GradeScale {
	readonly min: number;
	readonly max: number;
	readonly passingGrade: number;
	private readonly excellentGrade: number;

	constructor(passingGrade?: number | null) {
		this.min = VIGESIMAL_DEFAULTS.min;
		this.max = VIGESIMAL_DEFAULTS.max;
		this.passingGrade = passingGrade ?? VIGESIMAL_DEFAULTS.passingGrade;
		this.excellentGrade = Math.round(this.passingGrade * VIGESIMAL_DEFAULTS.excellentRatio);
	}

	classify(nota: number): GradeClassification {
		if (nota >= this.excellentGrade) {
			return { severity: 'success', cssClass: 'grade-green', label: 'Excelente', esAprobatoria: true };
		}
		if (nota >= this.passingGrade) {
			return { severity: 'warn', cssClass: 'grade-green', label: 'Aprobado', esAprobatoria: true };
		}
		return { severity: 'danger', cssClass: 'grade-red', label: 'Desaprobado', esAprobatoria: false };
	}

	format(nota: number): string {
		return nota.toFixed(1);
	}

	isAprobatoria(nota: number): boolean {
		return nota >= this.passingGrade;
	}

	convertTo(nota: number, targetScale: GradeScale): number {
		const normalized = (nota - this.min) / (this.max - this.min);
		return targetScale.min + normalized * (targetScale.max - targetScale.min);
	}
}
// #endregion

// #region Escala Literal (AD/A/B/C)
/**
 * Escala literal: sistema de calificación por letras.
 *
 * Cada literal define un rango numérico (notaMinima-notaMaxima)
 * y si es aprobatoria. La clasificación se determina por el orden
 * del literal dentro del rango.
 */
export class LiteralScale implements GradeScale {
	readonly min: number;
	readonly max: number;
	readonly passingGrade: number;
	private readonly sortedLiterales: ConfiguracionLiteralDto[];

	constructor(
		literales: ConfiguracionLiteralDto[],
		passingGrade?: number | null,
	) {
		this.sortedLiterales = [...literales].sort((a, b) => a.orden - b.orden);
		this.min = VIGESIMAL_DEFAULTS.min;
		this.max = VIGESIMAL_DEFAULTS.max;
		this.passingGrade = passingGrade ?? VIGESIMAL_DEFAULTS.passingGrade;
	}

	classify(nota: number): GradeClassification {
		for (const literal of this.sortedLiterales) {
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

	format(nota: number): string {
		const literal = this.findLiteral(nota);
		return literal ? literal.letra : nota.toFixed(1);
	}

	isAprobatoria(nota: number): boolean {
		const literal = this.findLiteral(nota);
		return literal?.esAprobatoria ?? false;
	}

	convertTo(nota: number, targetScale: GradeScale): number {
		const normalized = (nota - this.min) / (this.max - this.min);
		return targetScale.min + normalized * (targetScale.max - targetScale.min);
	}

	/** Encuentra el literal correspondiente a una nota numérica */
	findLiteral(nota: number): ConfiguracionLiteralDto | null {
		for (const literal of this.sortedLiterales) {
			if (literal.notaMinima !== null && literal.notaMaxima !== null) {
				if (nota >= literal.notaMinima && nota <= literal.notaMaxima) {
					return literal;
				}
			}
		}
		return this.sortedLiterales[this.sortedLiterales.length - 1] ?? null;
	}
}
// #endregion

// #region Escala Centesimal (0-100)
/**
 * Escala centesimal: sistema de calificación sobre 100.
 *
 * Preparada para uso futuro si se requiere una escala 0-100.
 * Misma lógica de umbrales que vigesimal pero con rango extendido.
 */
export class CentesimalScale implements GradeScale {
	readonly min: number;
	readonly max: number;
	readonly passingGrade: number;
	private readonly excellentGrade: number;

	constructor(passingGrade?: number | null) {
		this.min = CENTESIMAL_DEFAULTS.min;
		this.max = CENTESIMAL_DEFAULTS.max;
		this.passingGrade = passingGrade ?? CENTESIMAL_DEFAULTS.passingGrade;
		this.excellentGrade = Math.round(this.passingGrade * CENTESIMAL_DEFAULTS.excellentRatio);
	}

	classify(nota: number): GradeClassification {
		if (nota >= this.excellentGrade) {
			return { severity: 'success', cssClass: 'grade-green', label: 'Excelente', esAprobatoria: true };
		}
		if (nota >= this.passingGrade) {
			return { severity: 'warn', cssClass: 'grade-green', label: 'Aprobado', esAprobatoria: true };
		}
		return { severity: 'danger', cssClass: 'grade-red', label: 'Desaprobado', esAprobatoria: false };
	}

	format(nota: number): string {
		return nota.toFixed(0);
	}

	isAprobatoria(nota: number): boolean {
		return nota >= this.passingGrade;
	}

	convertTo(nota: number, targetScale: GradeScale): number {
		const normalized = (nota - this.min) / (this.max - this.min);
		return targetScale.min + normalized * (targetScale.max - targetScale.min);
	}
}
// #endregion

// #region Factory
/**
 * Crea la escala apropiada a partir de la configuración del backend.
 *
 * Este es el punto de entrada principal: recibe el DTO del servidor
 * y retorna la implementación de GradeScale correcta.
 *
 * @param config Configuración del backend (null = vigesimal default)
 */
export function createGradeScale(config: ConfiguracionCalificacionListDto | null): GradeScale {
	if (config?.tipoCalificacion === 'LITERAL' && config.literales.length > 0) {
		return new LiteralScale(config.literales, config.notaMinAprobatoria);
	}
	return new VigesimalScale(config?.notaMinAprobatoria);
}
// #endregion
