import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrae un mensaje legible de un error HTTP o genérico.
 * Busca en orden: err.error.mensaje, err.error.message, err.message, fallback.
 *
 * @example
 * catch (err) {
 *   const msg = extractErrorMessage(err);
 *   // "El recurso ya existe" (del backend) o "Error desconocido" (fallback)
 * }
 */
export function extractErrorMessage(err: unknown, fallback = 'Error desconocido'): string {
	if (err instanceof HttpErrorResponse) {
		return err.error?.mensaje ?? err.error?.message ?? err.message ?? fallback;
	}

	if (err instanceof Error) {
		return err.message || fallback;
	}

	if (typeof err === 'string') {
		return err;
	}

	// Error genérico con shape { error: { message } }
	const asAny = err as Record<string, unknown> | null;
	if (asAny?.['error'] && typeof asAny['error'] === 'object') {
		const inner = asAny['error'] as Record<string, unknown>;
		if (typeof inner['mensaje'] === 'string') return inner['mensaje'];
		if (typeof inner['message'] === 'string') return inner['message'];
	}

	return fallback;
}
