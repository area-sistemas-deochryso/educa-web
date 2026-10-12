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

// #region Promedio parcial (INV-C12)
/**
 * Promedio parcial = Σ(nota × peso) ÷ Σ(peso) sobre las evaluaciones con nota,
 * 1 decimal. Espejo local del calculo del BE para el simulador de notas del
 * estudiante; el promedio parcial real de "Mis notas" lo entrega el BE.
 * Retorna null si no hay evaluaciones con peso (cobertura 0).
 */
export function calcularPromedioParcial(
	evaluaciones: { nota: number; peso: number }[],
): number | null {
	const pesoTotal = evaluaciones.reduce((acc, e) => acc + e.peso, 0);
	if (evaluaciones.length === 0 || pesoTotal <= 0) return null;
	const suma = evaluaciones.reduce((acc, e) => acc + e.nota * e.peso, 0);
	return Math.round((suma / pesoTotal) * 10) / 10;
}

/** Cobertura (0-100, entero) de un conjunto de evaluaciones calificadas: Σ(peso) × 100, tope 100. */
export function calcularCoberturaPorPesos(evaluaciones: { peso: number }[]): number {
	const pesoTotal = evaluaciones.reduce((acc, e) => acc + e.peso, 0);
	return Math.min(100, Math.round(pesoTotal * 100));
}

/** Rotulo de un promedio parcial: "Parcial · 20 % evaluado". Con cobertura 100 % no hay rotulo (parcial = oficial). */
export function getRotuloParcial(cobertura: number): string | null {
	return cobertura < 100 ? `Parcial · ${cobertura} % evaluado` : null;
}
// #endregion

// #region Cobertura del promedio general (vistas del profesor — INV-C04)
/**
 * Umbral de % del curso evaluado por debajo del cual el promedio general
 * se muestra en color neutro en vez del semaforo real. Ajustable — no es
 * un valor de negocio cerrado. Solo vistas del profesor: el estudiante usa
 * el promedio parcial del BE (INV-C12) y no neutraliza por cobertura.
 */
export const UMBRAL_COBERTURA_PROMEDIO_GENERAL = 50;

/**
 * % del peso total del curso que ya tiene nota registrada.
 * Los pesos son fracciones absolutas del curso (INV-C04) — no se normalizan.
 */
export function calcularPorcentajeEvaluado(
	evaluaciones: { peso: number; nota: number | null }[],
): number {
	if (evaluaciones.length === 0) return 100;
	const pesoEvaluado = evaluaciones
		.filter((e) => e.nota !== null && e.nota !== undefined)
		.reduce((acc, e) => acc + e.peso, 0);
	return Math.round(pesoEvaluado * 100);
}

/**
 * Un promedio es "provisional" cuando todavia no alcanzo el umbral de
 * cobertura del curso — el numero es matematicamente correcto pero no
 * representativo aun.
 */
export function esPromedioProvisional(
	promedio: number | null,
	porcentajeEvaluado: number,
	umbral: number = UMBRAL_COBERTURA_PROMEDIO_GENERAL,
): boolean {
	return promedio !== null && promedio !== undefined && porcentajeEvaluado < umbral;
}

/**
 * Clasifica el promedio general considerando su cobertura: por debajo del
 * umbral, neutraliza severity/cssClass/label (no aplica semaforo) sin
 * cambiar el numero ni `esAprobatoria`. En o sobre el umbral, delega
 * enteramente en `clasificarNota`.
 */
export function clasificarPromedioConCobertura(
	promedio: number | null,
	porcentajeEvaluado: number,
	config: ConfiguracionCalificacionListDto | null = null,
	umbral: number = UMBRAL_COBERTURA_PROMEDIO_GENERAL,
): GradeClassification {
	const base = clasificarNota(promedio, config);
	if (!esPromedioProvisional(promedio, porcentajeEvaluado, umbral)) return base;
	return { ...base, severity: 'secondary', cssClass: '', label: 'Provisional' };
}

/**
 * Severity de PrimeNG para el promedio general, considerando cobertura.
 */
export function getPromedioSeverity(
	promedio: number | null,
	porcentajeEvaluado: number,
	config: ConfiguracionCalificacionListDto | null = null,
	umbral: number = UMBRAL_COBERTURA_PROMEDIO_GENERAL,
): GradeClassification['severity'] {
	return clasificarPromedioConCobertura(promedio, porcentajeEvaluado, config, umbral).severity;
}
// #endregion
