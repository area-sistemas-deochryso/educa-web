import { HttpErrorResponse } from '@angular/common/http';

const APAGAR_CONTROL = 'Desactiva «Es calificable» para crearla sin evaluación.';

/** Códigos que el diálogo explica por sí mismo (el resto cae al toast genérico). */
export function tareaEvaluacionErrorCode(err: unknown): string | null {
	return err instanceof HttpErrorResponse ? ((err.error?.errorCode as string | undefined) ?? null) : null;
}

/**
 * Mensaje dentro del diálogo para un rechazo de «crear tarea con evaluación» (868).
 * Devuelve `null` si el error no es de este flujo.
 */
export function buildTareaEvaluacionError(err: unknown): string | null {
	switch (tareaEvaluacionErrorCode(err)) {
		case 'EVALUACION_PESO_EXCEDIDO': {
			const cupo = (err as HttpErrorResponse).error?.data?.cupoRestante;
			const detalle = typeof cupo === 'number' ? ` Cupo disponible: ${formatPct(cupo)}.` : '';
			return `El peso supera el cupo de evaluaciones del curso.${detalle} Reduce el peso o ${lowerFirst(APAGAR_CONTROL)}`;
		}
		case 'EVALUACION_PERIODO_CERRADO':
			return `El periodo está cerrado y no admite evaluaciones nuevas. ${APAGAR_CONTROL}`;
		case 'EVALUACION_EDIT_WINDOW_EXCEEDED':
			return `La fecha límite es de hace más de 2 meses y la evaluación nacería bloqueada. ${APAGAR_CONTROL}`;
		case 'EVALUACION_PESO_INVALIDO':
			return 'El peso debe estar entre 1 % y 100 %.';
		default:
			return null;
	}
}

/** Fracción 0–1 → «25 %» (hasta 2 decimales, sin ceros sobrantes). */
export function formatPct(fraccion: number): string {
	return `${Math.round(fraccion * 10000) / 100} %`;
}

function lowerFirst(text: string): string {
	return text.charAt(0).toLowerCase() + text.slice(1);
}
