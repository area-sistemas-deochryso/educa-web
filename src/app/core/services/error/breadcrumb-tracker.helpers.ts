import { BREADCRUMB_IGNORED_4XX } from './breadcrumb-tracker.models';

// #region Constantes
const ROUTE_MAX_LENGTH = 200;
const ERROR_CLASS_MAX_LENGTH = 100;
const DYNAMIC_SEGMENT = /^(\d+|[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12})$/;
const ERROR_CLASS = /^[A-Za-z0-9_.$]+$/;
const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
// #endregion

// #region Normalización (ADR-0008: forma, nunca contenido)
/**
 * Devuelve solo el path, sin query string ni fragmento, con los segmentos numéricos,
 * GUID o con '@' reemplazados por `:id`. Mismo criterio que el BE (`NormalizarRuta`).
 * Si no se puede interpretar como ruta, devuelve `/` en vez de arriesgar contenido.
 */
export function normalizeRoute(urlOrPath: string): string {
	let path = urlOrPath;
	if (!path.startsWith('/')) {
		try {
			path = new URL(path, 'http://localhost').pathname;
		} catch {
			return '/';
		}
	}

	const cut = path.search(/[?#]/);
	const clean = cut >= 0 ? path.slice(0, cut) : path;

	const normalized = clean
		.split('/')
		.map((segment) =>
			segment.length > 0 && segment[0] !== ':' && (segment.includes('@') || DYNAMIC_SEGMENT.test(segment))
				? ':id'
				: segment,
		)
		.join('/');

	return normalized.slice(0, ROUTE_MAX_LENGTH) || '/';
}

export function sanitizeMethod(method: string | undefined): string | undefined {
	const upper = method?.toUpperCase();
	return upper && VALID_METHODS.has(upper) ? upper : undefined;
}

export function sanitizeErrorClass(name: string | undefined): string {
	if (!name || name.length > ERROR_CLASS_MAX_LENGTH || !ERROR_CLASS.test(name)) return 'Error';
	return name;
}
// #endregion

// #region Criterio de envío
/** 5xx o 4xx inesperado. El status 0 (red caída) no cuenta: el envío fallaría igual. */
export function isReportableHttpStatus(status: number): boolean {
	if (status >= 500) return true;
	if (status < 400) return false;
	return !(BREADCRUMB_IGNORED_4XX as readonly number[]).includes(status);
}
// #endregion
