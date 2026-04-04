import type { ConfiguracionLiteralDto } from '@data/models';
import type { GradeClassification, GradeScale } from './grade-scale.models';
import { VIGESIMAL_DEFAULTS } from './grade-scale.models';

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
