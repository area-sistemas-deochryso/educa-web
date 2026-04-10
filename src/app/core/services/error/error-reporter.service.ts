import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { ActivityTrackerService } from './activity-tracker.service';
import { Breadcrumb } from './activity-tracker.models';
import { environment } from '@config/environment';
import { logger } from '@core/helpers';

// #region Tipos internos

type ErrorOrigen = 'FRONTEND' | 'BACKEND' | 'NETWORK';

interface SourceLocation {
	archivo: string | null;
	funcion: string | null;
	linea: number | null;
	columna: number | null;
}

interface ErrorReportPayload {
	correlationId: string | null;
	origen: ErrorOrigen;
	mensaje: string;
	stackTrace: string | null;
	url: string;
	httpMethod: string | null;
	httpStatus: number | null;
	errorCode: string | null;
	severidad: 'CRITICAL' | 'ERROR' | 'WARNING';
	plataforma: 'WEB' | 'ANDROID' | 'IOS';
	userAgent: string;
	sourceLocation: string | null;
	breadcrumbs: BreadcrumbPayload[];
}

interface BreadcrumbPayload {
	tipo: string;
	descripcion: string;
	ruta: string;
	timestamp: number;
	metadata: string | null;
}

const BREADCRUMB_LIMITS: Record<string, number> = {
	js_unhandled: 30,
	http_500: 30,
	http_422: 15,
	http_400: 15,
	http_401: 10,
	http_403: 10,
	http_409: 10,
	http_network: 5,
	default: 15,
};

// #endregion

@Injectable({ providedIn: 'root' })
export class ErrorReporterService {
	private readonly http = inject(HttpClient);
	private readonly activityTracker = inject(ActivityTrackerService);

	private reportCount = 0;
	private resetTimer: ReturnType<typeof setTimeout> | null = null;
	private static readonly MAX_REPORTS_PER_MINUTE = 10;
	private static readonly ENDPOINT = `${environment.apiUrl}/api/sistema/errors`;

	// #region API pública

	reportHttpError(
		status: number,
		url: string,
		method?: string,
		errorCode?: string,
		correlationId?: string,
		stack?: string,
	): void {
		if (!this.canReport()) return;

		const origen = this.classifyHttpOrigin(status);
		const breadcrumbKey = this.getBreadcrumbKey(status);
		const maxBreadcrumbs = BREADCRUMB_LIMITS[breadcrumbKey] ?? BREADCRUMB_LIMITS['default'];
		const sourceLocation = stack ? this.parseSourceLocation(stack) : null;

		// Capturar call site del frontend si no hay stack del error
		const effectiveStack = stack ?? this.captureCallSite();

		const payload = this.buildPayload({
			origen,
			mensaje: `HTTP ${status}: ${this.sanitizeUrl(url)}`,
			stackTrace: effectiveStack?.substring(0, 4000) ?? null,
			url: this.sanitizeUrl(url),
			httpMethod: method ?? null,
			httpStatus: status,
			errorCode: errorCode ?? null,
			severidad: status >= 500 ? 'CRITICAL' : 'ERROR',
			correlationId: correlationId ?? null,
			sourceLocation,
			breadcrumbCount: maxBreadcrumbs,
		});

		this.send(payload);
	}

	reportClientError(message: string, stack?: string, correlationId?: string): void {
		if (!this.canReport()) return;

		const sourceLocation = stack ? this.parseSourceLocation(stack) : null;

		const payload = this.buildPayload({
			origen: 'FRONTEND',
			mensaje: message.substring(0, 500),
			stackTrace: stack?.substring(0, 4000) ?? null,
			url: window.location.pathname,
			httpMethod: null,
			httpStatus: null,
			errorCode: null,
			severidad: 'CRITICAL',
			correlationId: correlationId ?? null,
			sourceLocation,
			breadcrumbCount: BREADCRUMB_LIMITS['js_unhandled'],
		});

		this.send(payload);
	}

	// #endregion

	// #region Clasificación de origen

	/**
	 * Determina el VERDADERO origen del error basado en el HTTP status:
	 * - 0, 408, 504 → NETWORK (el backend no respondió)
	 * - 500+ → BACKEND (el servidor falló)
	 * - 4xx → FRONTEND (el frontend envió algo incorrecto)
	 */
	private classifyHttpOrigin(status: number): ErrorOrigen {
		if (status === 0 || status === 408 || status === 504) return 'NETWORK';
		if (status >= 500) return 'BACKEND';
		return 'FRONTEND';
	}

	// #endregion

	// #region Source location parsing

	/**
	 * Extrae la cadena de llamadas legible del stack trace.
	 *
	 * En Angular dev/prod, todo el código (app + librerías) va en chunks minificados.
	 * No podemos distinguir "app code" de "library code" por nombre de archivo.
	 *
	 * Estrategia:
	 * 1. Extraer funciones con nombre legible (>2 chars, no anónimas)
	 * 2. Construir cadena: "alignOverlay → onOverlayBeforeEnter" (las más cercanas al error)
	 * 3. Guardar como sourceLocation para mostrar en el drawer
	 */
	private parseSourceLocation(stack: string): SourceLocation | null {
		const readableFunctions: string[] = [];

		for (const line of stack.split('\n')) {
			const trimmed = line.trim();
			if (!trimmed.startsWith('at ')) continue;

			// Extraer nombre de función: "at FunctionName (...)" o "at Class.method (...)"
			const fnMatch = /at\s+([A-Za-z_$][\w$.]+(?:\.\w+)*)\s+\(/.exec(trimmed);
			if (!fnMatch) continue;

			let fn = fnMatch[1]
				.replace(/^Object\./, '')
				.replace(/\.prototype\./, '.');

			// Quitar prefijo de variable minificada: "n.alignOverlay" → "alignOverlay"
			// Solo si el prefijo es 1-2 chars (variable minificada, no una clase real)
			fn = fn.replace(/^[a-z]{1,2}\./, '');

			// Solo funciones legibles (>2 chars, no helpers internos genéricos)
			if (fn.length <= 2) continue;
			if (/^(next|error|subscribe|run|invoke|handle|emit|push|call|apply|then|catch|callback|dispatch|trigger|fire|notify|send|process|execute)$/i.test(fn)) continue;

			readableFunctions.push(fn);
			if (readableFunctions.length >= 3) break;
		}

		if (readableFunctions.length === 0) return null;

		// La primera es donde ocurrió, las siguientes son quién la llamó
		return {
			funcion: readableFunctions.join(' ← '),
			archivo: null,
			linea: null,
			columna: null,
		};
	}

	/** Captura el call site actual para errores HTTP que no tienen stack propio */
	private captureCallSite(): string | null {
		try {
			const err = new Error();
			return err.stack?.substring(0, 2000) ?? null;
		} catch {
			return null;
		}
	}

	// #endregion

	// #region Rate limiting

	private canReport(): boolean {
		if (this.reportCount >= ErrorReporterService.MAX_REPORTS_PER_MINUTE) return false;
		this.reportCount++;

		if (!this.resetTimer) {
			this.resetTimer = setTimeout(() => {
				this.reportCount = 0;
				this.resetTimer = null;
			}, 60_000);
		}

		return true;
	}

	// #endregion

	// #region Builders

	private buildPayload(opts: {
		origen: ErrorOrigen;
		mensaje: string;
		stackTrace: string | null;
		url: string;
		httpMethod: string | null;
		httpStatus: number | null;
		errorCode: string | null;
		severidad: 'CRITICAL' | 'ERROR' | 'WARNING';
		correlationId: string | null;
		sourceLocation: SourceLocation | null;
		breadcrumbCount: number;
	}): ErrorReportPayload {
		const breadcrumbs = this.activityTracker.getBreadcrumbs(opts.breadcrumbCount);

		return {
			correlationId: opts.correlationId,
			origen: opts.origen,
			mensaje: opts.mensaje,
			stackTrace: opts.stackTrace,
			url: opts.url,
			httpMethod: opts.httpMethod,
			httpStatus: opts.httpStatus,
			errorCode: opts.errorCode,
			severidad: opts.severidad,
			plataforma: this.detectPlatform(),
			userAgent: navigator.userAgent.substring(0, 500),
			sourceLocation: opts.sourceLocation
				? JSON.stringify(opts.sourceLocation).substring(0, 500)
				: null,
			breadcrumbs: breadcrumbs.map(this.mapBreadcrumb),
		};
	}

	private mapBreadcrumb(b: Breadcrumb): BreadcrumbPayload {
		return {
			tipo: b.tipo,
			descripcion: b.descripcion.substring(0, 500),
			ruta: b.ruta.substring(0, 200),
			timestamp: b.timestamp,
			metadata: b.metadata ? JSON.stringify(b.metadata).substring(0, 500) : null,
		};
	}

	// #endregion

	// #region Envío

	private send(payload: ErrorReportPayload): void {
		const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });

		this.http
			.post(ErrorReporterService.ENDPOINT, payload, { headers })
			.subscribe({
				error: () => {
					logger.warn('[ErrorReporter] Failed to send error report');
				},
			});
	}

	// #endregion

	// #region Helpers

	private getBreadcrumbKey(status: number): string {
		if (status === 0 || status === 408 || status === 504) return 'http_network';
		if (status >= 500) return 'http_500';
		if (status === 422) return 'http_422';
		if (status === 400) return 'http_400';
		if (status === 401) return 'http_401';
		if (status === 403) return 'http_403';
		if (status === 409) return 'http_409';
		return 'default';
	}

	private sanitizeUrl(url: string): string {
		try {
			const parsed = new URL(url, window.location.origin);
			return parsed.pathname.substring(0, 500);
		} catch {
			return url.split('?')[0].substring(0, 500);
		}
	}

	private detectPlatform(): 'WEB' | 'ANDROID' | 'IOS' {
		const ua = navigator.userAgent.toLowerCase();
		if (ua.includes('android') && ua.includes('capacitor')) return 'ANDROID';
		if ((ua.includes('iphone') || ua.includes('ipad')) && ua.includes('capacitor')) return 'IOS';
		return 'WEB';
	}

	// #endregion
}
