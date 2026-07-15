import { HttpErrorResponse } from '@angular/common/http';
// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-87 F443
import { UI_ERROR_CODES } from '@shared/constants';

/**
 * Resuelve el mensaje de error priorizando `errorCode` del backend contra
 * `UI_ERROR_CODES`. Si el backend no manda `errorCode` o no está catalogado,
 * usa `fallback`.
 *
 * Reemplaza al patrón ad-hoc repetido en facades que atrapan el error ellos
 * mismos en vez de delegar al interceptor central (`error.interceptor.ts`).
 *
 * @example
 * catch (err) {
 *   const msg = resolveErrorMessage(err, 'No se pudo guardar');
 * }
 */
export function resolveErrorMessage(err: unknown, fallback: string): string {
	const errorCode = err instanceof HttpErrorResponse ? (err.error?.errorCode as string | undefined) : undefined;
	return (errorCode && UI_ERROR_CODES[errorCode]) || fallback;
}

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
