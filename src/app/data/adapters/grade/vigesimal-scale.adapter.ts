import type { GradeClassification, GradeScale } from './grade-scale.models';
import { VIGESIMAL_DEFAULTS } from './grade-scale.models';

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
