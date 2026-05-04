import { HttpErrorResponse } from '@angular/common/http';

/**
 * Checks if error is a 409 Conflict (idempotency / concurrency).
 */
export function isConflictError(error: unknown): boolean {
	return error instanceof HttpErrorResponse && error.status === 409;
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
 */
export function extractErrorMessage(error: unknown): string {
	if (error instanceof HttpErrorResponse) {
		if (error.status === 0) return 'Network error';
		const serverMsg =
			error.error?.message || error.error?.error || error.statusText;
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
	| { kind: 'conflict' }
	| { kind: 'permanent'; message: string }
	| { kind: 'retryable' };

/**
 * Pure classifier: maps an arbitrary error to one of the three WAL outcomes.
 * Side-effect free — the engine applies effects according to the result.
 */
export function classifyWalError(error: unknown): WalErrorClassification {
	if (isConflictError(error)) return { kind: 'conflict' };
	if (isPermanentError(error)) {
		return { kind: 'permanent', message: extractErrorMessage(error) };
	}
	return { kind: 'retryable' };
}
