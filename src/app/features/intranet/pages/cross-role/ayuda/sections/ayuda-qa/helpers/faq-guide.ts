import { FaqProgresoDto, GuideProgress, GuideSummary } from '@features/intranet/pages/cross-role/ayuda/models/faq.models';

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

/** Avance del servidor → forma de la UI (`actual` ausente = ningún paso trabajado). */
export function progressFromDto(dto: Pick<FaqProgresoDto, 'hechos' | 'actual'>): GuideProgress {
	return { done: dto.hechos, current: dto.actual ?? null };
}

/**
 * Recorta el avance al rango de pasos actual: una guía editada puede tener más o menos pasos que
 * cuando se guardó, y no hay versionado de pasos. Descarta lo que no sea índice entero válido.
 */
export function clipGuideProgress(done: readonly number[], current: number | null | undefined, total: number): GuideProgress {
	const inRange = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < total;
	return {
		done: [...new Set(done.filter(inRange))].sort((a, b) => a - b),
		current: inRange(current) ? current : null,
	};
}

/** `null` si la guía no tiene avance (nunca vista o reiniciada): la lista no la marca. */
export function summarizeGuideProgress(progress: GuideProgress, total: number, fecha: string): GuideSummary | null {
	const clipped = clipGuideProgress(progress.done, progress.current, total);
	if (clipped.done.length === 0) return null;

	const done = new Set(clipped.done);
	const firstPending = Array.from({ length: total }, (_, i) => i).find((i) => !done.has(i)) ?? null;
	const finished = firstPending === null;
	return {
		status: finished ? 'terminada' : 'en-curso',
		done: done.size,
		total,
		step: (clipped.current ?? firstPending ?? total - 1) + 1,
		fecha,
	};
}
