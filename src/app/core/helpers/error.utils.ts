import { HttpErrorResponse } from '@angular/common/http';
// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-87 F443
import { UI_ERROR_CODES } from '@shared/constants';

import { parseProblemDetails } from './problem-details.adapter';

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
 * Extrae solo el mensaje curado por el backend de un `HttpErrorResponse`, ignorando
 * el `err.message` técnico que Angular siempre setea ("Http failure response for …").
 * Busca en orden: `detail` (ProblemDetails, vía `parseProblemDetails`, que también
 * cubre `message`/`mensaje` legacy), `errors` como array de strings (BusinessRuleException),
 * `errors` como diccionario (ValidationProblemDetails). Devuelve `null` si no hay ninguno.
 */
export function extractBackendMessage(err: unknown): string | null {
	if (!(err instanceof HttpErrorResponse)) return null;

	const { detail, validationErrors } = parseProblemDetails(err);
	if (detail) return detail;

	// BusinessRuleException: { errors: ["msg", ...] }
	const errors = err.error?.errors;
	if (Array.isArray(errors) && typeof errors[0] === 'string' && errors[0]) return errors[0];

	// ASP.NET Core ValidationProblemDetails: { errors: { fieldName: ["msg"] } }
	if (validationErrors) return Object.values(validationErrors)[0][0];

	return null;
}

/**
 * Extrae un mensaje legible de un error HTTP o genérico.
 * Para `HttpErrorResponse` prioriza el mensaje del backend (`extractBackendMessage`),
 * luego err.message (texto técnico de Angular, por compatibilidad), luego fallback.
 *
 * @example
 * catch (err) {
 *   const msg = extractErrorMessage(err);
 *   // "El recurso ya existe" (del backend) o "Error desconocido" (fallback)
 * }
 */
export function extractErrorMessage(err: unknown, fallback = 'Error desconocido'): string {
	if (err instanceof HttpErrorResponse) {
		return extractBackendMessage(err) ?? (err.message || fallback);
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
