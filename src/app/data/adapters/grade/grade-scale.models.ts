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
 * Excepción documentada a "adapters/ solo mapea API↔dominio": las clases de
 * `grade/` implementan Strategy pattern — cada escala es una estrategia de
 * dominio completa (umbrales de aprobación incluidos), no un simple mapper.
 * Se agrupan acá porque comparten el mismo punto de entrada (`grade-scale.factory.ts`)
 * y el mismo contrato (`GradeScale`).
 *
 * Hoy soportamos vigesimal (0-20) y literal (AD/A/B/C). Si mañana se necesita
 * centesimal (0-100) o percentil, basta con implementar esta interfaz —
 * no agregar la escala hasta tener un caller real.
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

/** Umbrales históricos del sistema vigesimal peruano */
export const VIGESIMAL_DEFAULTS = {
	min: 0,
	max: 20,
	passingGrade: 11,
	excellentRatio: 1.27,
} as const;
