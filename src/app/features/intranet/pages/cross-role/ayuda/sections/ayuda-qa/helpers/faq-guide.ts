import { AyudaGuideProgress } from '@core/services/storage';

const TITLE_MAX_LENGTH = 60;

/** Primera frase del texto del paso, recortada. F6 la reemplaza por el título real del servidor. */
export function deriveStepTitle(texto: string): string {
	const text = texto.trim().replace(/\s+/g, ' ');
	const firstSentence = text.split(/(?<=[.!?:])\s/)[0].replace(/[.:]$/, '');
	if (firstSentence.length <= TITLE_MAX_LENGTH) return firstSentence;
	return `${firstSentence.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}

/** Estimación aproximada: un minuto por paso, mínimo uno. No es un dato del servidor. */
export function estimateMinutes(totalSteps: number): number {
	return Math.max(1, totalSteps);
}

/** El avance viene del navegador: se descarta lo que no tenga la forma esperada. */
export function sanitizeGuideProgress(value: unknown): AyudaGuideProgress {
	if (typeof value !== 'object' || value === null) return { done: [], current: null };
	const { done, current } = value as { done?: unknown; current?: unknown };
	return {
		done: Array.isArray(done) ? done.filter((n): n is number => Number.isInteger(n)) : [],
		current: typeof current === 'number' && Number.isInteger(current) ? current : null,
	};
}
