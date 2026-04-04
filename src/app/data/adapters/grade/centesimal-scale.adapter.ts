import type { GradeClassification, GradeScale } from './grade-scale.models';
import { CENTESIMAL_DEFAULTS } from './grade-scale.models';

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
