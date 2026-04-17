export type ErrorOrigen = 'FRONTEND' | 'BACKEND' | 'NETWORK';

export interface SourceLocation {
	archivo: string | null;
	funcion: string | null;
	linea: number | null;
	columna: number | null;
}

/**
 * Determina el VERDADERO origen del error según HTTP status.
 * - status 0 → NETWORK (request nunca llegó)
 * - 408/502/503/504 → NETWORK
 * - navigator.onLine false → NETWORK
 * - 500+ → BACKEND
 * - 4xx → FRONTEND
 */
export function classifyHttpOrigin(status: number, isBrowser: boolean): ErrorOrigen {
	if (status === 0) return 'NETWORK';
	if (status === 408 || status === 502 || status === 503 || status === 504) return 'NETWORK';
	if (isBrowser && !navigator.onLine) return 'NETWORK';
	if (status >= 500) return 'BACKEND';
	return 'FRONTEND';
}

const GENERIC_FN_NAMES = /^(next|error|subscribe|run|invoke|handle|emit|push|call|apply|then|catch|callback|dispatch|trigger|fire|notify|send|process|execute)$/i;

/**
 * Extrae la cadena de llamadas legible del stack trace.
 * En Angular dev/prod todo va en chunks minificados — se extrae por nombres
 * legibles de funciones y se construye la cadena "fn1 ← fn2 ← fn3".
 */
export function parseSourceLocation(stack: string): SourceLocation | null {
	const readable: string[] = [];
	for (const line of stack.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed.startsWith('at ')) continue;
		const match = /at\s+([A-Za-z_$][\w$.]+(?:\.\w+)*)\s+\(/.exec(trimmed);
		if (!match) continue;
		let fn = match[1].replace(/^Object\./, '').replace(/\.prototype\./, '.');
		fn = fn.replace(/^[a-z]{1,2}\./, '');
		if (fn.length <= 2) continue;
		if (GENERIC_FN_NAMES.test(fn)) continue;
		readable.push(fn);
		if (readable.length >= 3) break;
	}
	if (readable.length === 0) return null;
	return { funcion: readable.join(' ← '), archivo: null, linea: null, columna: null };
}

/** Captura el call site actual para errores HTTP que no tienen stack propio */
export function captureCallSite(): string | null {
	try {
		const err = new Error();
		return err.stack?.substring(0, 2000) ?? null;
	} catch {
		return null;
	}
}

export function getBreadcrumbKey(status: number): string {
	if (status === 0 || status === 408 || status === 504) return 'http_network';
	if (status >= 500) return 'http_500';
	if (status === 422) return 'http_422';
	if (status === 400) return 'http_400';
	if (status === 401) return 'http_401';
	if (status === 403) return 'http_403';
	if (status === 409) return 'http_409';
	return 'default';
}

// #region Sanitización de payloads y URLs

/** Query params que se stripean completamente (cache-busting, tokens) */
const STRIP_PARAMS = new Set(['access_token', 'token', '_', 't', 'timestamp', 'cachebust', 'nocache']);

/** Keys de payload que se enmascaran */
const SENSITIVE_KEYS = new Set([
	'password', 'contrasena', 'contraseña', 'token', 'secret',
	'accesstoken', 'access_token', 'refreshtoken', 'refresh_token',
	'authorization', 'cookie',
]);
const DNI_KEYS = new Set(['dni', 'usuariodni']);

export function sanitizeUrl(url: string, isBrowser: boolean): string {
	try {
		const origin = isBrowser ? window.location.origin : 'http://localhost';
		const parsed = new URL(url, origin);

		// Preservar query params (sanitizados), solo stripear cache-busting y tokens
		const sanitizedParams = new URLSearchParams();
		for (const [key, value] of parsed.searchParams) {
			if (STRIP_PARAMS.has(key.toLowerCase())) continue;
			if (SENSITIVE_KEYS.has(key.toLowerCase())) {
				sanitizedParams.set(key, '***');
			} else if (DNI_KEYS.has(key.toLowerCase())) {
				sanitizedParams.set(key, value.length >= 4 ? `***${value.slice(-4)}` : '***');
			} else {
				sanitizedParams.set(key, value);
			}
		}

		const qs = sanitizedParams.toString();
		const result = qs ? `${parsed.pathname}?${qs}` : parsed.pathname;
		return result.substring(0, 500);
	} catch {
		return url.split('?')[0].substring(0, 500);
	}
}

/**
 * Sanitiza un payload (request body o response body) para almacenamiento seguro.
 * Enmascara campos sensibles (passwords, tokens, DNIs).
 */
export function sanitizePayload(body: unknown, maxLength = 4000): string | null {
	if (body == null) return null;

	try {
		const str = typeof body === 'string' ? body : JSON.stringify(body);
		if (!str || str === '{}' || str === 'null') return null;

		const parsed = JSON.parse(str) as unknown;
		const sanitized = sanitizeObject(parsed);
		const result = JSON.stringify(sanitized);
		return result.length <= maxLength ? result : result.substring(0, maxLength - 12) + '...[truncado]';
	} catch {
		const raw = String(body);
		return raw.length <= maxLength ? raw : raw.substring(0, maxLength - 12) + '...[truncado]';
	}
}

function sanitizeObject(obj: unknown): unknown {
	if (obj === null || obj === undefined) return obj;
	if (Array.isArray(obj)) return obj.map(sanitizeObject);
	if (typeof obj !== 'object') return obj;

	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		const lower = key.toLowerCase();
		if (SENSITIVE_KEYS.has(lower)) {
			result[key] = '***';
		} else if (DNI_KEYS.has(lower) && typeof value === 'string') {
			result[key] = value.length >= 4 ? `***${value.slice(-4)}` : '***';
		} else {
			result[key] = sanitizeObject(value);
		}
	}
	return result;
}

// #endregion

export function detectPlatform(isBrowser: boolean): 'WEB' | 'ANDROID' | 'IOS' {
	if (!isBrowser) return 'WEB';
	const ua = navigator.userAgent.toLowerCase();
	if (ua.includes('android') && ua.includes('capacitor')) return 'ANDROID';
	if ((ua.includes('iphone') || ua.includes('ipad')) && ua.includes('capacitor')) return 'IOS';
	return 'WEB';
}
