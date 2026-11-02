import { HttpErrorResponse } from '@angular/common/http';

import { parseProblemDetails } from '@core/helpers';

/** `errorCode` del 409 que emite el BE cuando la operación con esa clave sigue en curso (INV-S06). */
export const IDEMPOTENCIA_EN_CURSO = 'IDEMPOTENCIA_EN_CURSO';

/**
 * Checks if error is a 409 Conflict (INV-S05, concurrencia de datos).
 * Un 409 `IDEMPOTENCIA_EN_CURSO` también tiene status 409: clasificar antes con `isInFlightError`.
 */
export function isConflictError(error: unknown): boolean {
	return error instanceof HttpErrorResponse && error.status === 409;
}

/**
 * Checks if error is a 409 `IDEMPOTENCIA_EN_CURSO`: la operación original sigue en curso
 * o con resultado desconocido. No es conflicto de datos: no hay rollback ni CONFLICT.
 */
export function isInFlightError(error: unknown): boolean {
	return (
		error instanceof HttpErrorResponse &&
		error.status === 409 &&
		parseProblemDetails(error).errorCode === IDEMPOTENCIA_EN_CURSO
	);
}

/**
 * Checks if error is a permanent client error (4xx except retryable ones).
 * Retryable 4xx: 401 (token refresh), 408 (timeout), 409 (conflict).
 *
 * 429 (rate limit) es permanente a propósito: reintentar un request rate-limited
 * EMPEORA el problema (suma al contador del rate limiter). El backoff del WAL
 * (max 30s) es más corto que la ventana del rate limiter (60s), así que el
 * retry siempre llega antes de que la ventana se cierre.
 * El patrón correcto: rollback + notificar al usuario + dejar que reintente manual.
 */
export function isPermanentError(error: unknown): boolean {
	if (!(error instanceof HttpErrorResponse)) return false;
	return (
		error.status >= 400 &&
		error.status < 500 &&
		error.status !== 401 &&
		error.status !== 408 &&
		error.status !== 409
	);
}

/**
 * Extract a human-readable error message from an HTTP or generic error.
 * Reuses `parseProblemDetails` (RFC 7807 + legacy ApiResponse + ValidationProblemDetails)
 * so a curated backend `detail` is shown as-is, without the technical `HTTP {status}:` prefix.
 */
export function extractErrorMessage(error: unknown): string {
	if (error instanceof HttpErrorResponse) {
		if (error.status === 0) return 'Network error';
		const { detail } = parseProblemDetails(error);
		if (detail) return detail;
		const serverMsg = error.error?.error || error.statusText;
		return `HTTP ${error.status}: ${serverMsg}`;
	}
	if (error instanceof Error) return error.message;
	return String(error);
}

/**
 * Classification of a WAL processing error.
 * Drives the dispatch in the engine's error orchestration step.
 */
export type WalErrorClassification =
	| { kind: 'in-flight' }
	| { kind: 'conflict' }
	| { kind: 'permanent'; message: string }
	| { kind: 'retryable' };

/**
 * Pure classifier: maps an arbitrary error to one of the WAL outcomes.
 * Side-effect free — the engine applies effects according to the result.
 */
export function classifyWalError(error: unknown): WalErrorClassification {
	if (isInFlightError(error)) return { kind: 'in-flight' };
	if (isConflictError(error)) return { kind: 'conflict' };
	if (isPermanentError(error)) {
		return { kind: 'permanent', message: extractErrorMessage(error) };
	}
	return { kind: 'retryable' };
}
