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
		// ApiResponse: mensaje / message
		if (err.error?.mensaje) return err.error.mensaje;
		if (err.error?.message) return err.error.message;

		// ASP.NET Core ValidationProblemDetails: { errors: { fieldName: ["msg"] } }
		const validationErrors = err.error?.errors;
		if (validationErrors && typeof validationErrors === 'object') {
			const firstField = Object.values(validationErrors as Record<string, unknown>)[0];
			if (Array.isArray(firstField) && firstField.length > 0 && typeof firstField[0] === 'string') {
				return firstField[0];
			}
		}

		return err.message || fallback;
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
