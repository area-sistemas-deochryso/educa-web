import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, debounceTime } from 'rxjs';

import { ActivityTrackerService } from './activity-tracker.service';
import { Breadcrumb } from './activity-tracker.models';
import {
	saveReportToOutbox,
	readPendingReports,
	removeReportFromOutbox,
} from './error-reporter-outbox.helper';
import {
	type ErrorOrigen,
	type SourceLocation,
	classifyHttpOrigin,
	parseSourceLocation,
	captureCallSite,
	getBreadcrumbKey,
	sanitizeUrl,
	sanitizePayload,
	detectPlatform,
} from './error-reporter.helpers';
import { type ErrorReportPayload, type BreadcrumbPayload, BREADCRUMB_LIMITS } from './error-reporter.models';
import { environment } from '@config/environment';
import { logger } from '@core/helpers';

@Injectable({ providedIn: 'root' })
export class ErrorReporterService {
	private readonly http = inject(HttpClient);
	private readonly activityTracker = inject(ActivityTrackerService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly isBrowser = typeof window !== 'undefined';

	private reportCount = 0;
	private resetTimer: ReturnType<typeof setTimeout> | null = null;
	private static readonly MAX_REPORTS_PER_MINUTE = 5;
	private static readonly ENDPOINT = `${environment.apiUrl}/api/sistema/errors`;

	/** Dedup: evita reportar el mismo error en cascada (misma URL + status en <5s) */
	private readonly recentReports = new Map<string, number>();
	private static readonly DEDUP_WINDOW_MS = 5_000;

	private flushInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		if (!this.isBrowser) return;
		this.listenOnline();
		this.listenSwRevalidationFailures();
		this.flushPending();
		this.flushInterval = setInterval(() => this.flushPending(), 30_000);
		this.destroyRef.onDestroy(() => {
			if (this.flushInterval) clearInterval(this.flushInterval);
		});
	}

	// #region API pública

	reportHttpError(
		status: number,
		url: string,
		method?: string,
		errorCode?: string,
		correlationId?: string,
		stack?: string,
		requestBody?: unknown,
		responseBody?: unknown,
	): void {
		if (!this.isBrowser || !this.canReport()) return;

		// Never report 429 — it's rate limiting, not a real error. Reporting it causes cascading 429s.
		if (status === 429) return;

		// Never report errors from own endpoint (anti-loop)
		if (url.includes('/api/sistema/errors')) return;

		// Dedup: no reportar la misma URL + status en <5s (errores en cascada)
		const dedupKey = `${status}:${sanitizeUrl(url, this.isBrowser)}`;
		const now = Date.now();
		if (this.recentReports.has(dedupKey) &&
			now - this.recentReports.get(dedupKey)! < ErrorReporterService.DEDUP_WINDOW_MS) {
			return;
		}
		this.recentReports.set(dedupKey, now);
		this.cleanRecentReports(now);

		const origen = classifyHttpOrigin(status, this.isBrowser);
		const breadcrumbKey = getBreadcrumbKey(status);
		const maxBreadcrumbs = BREADCRUMB_LIMITS[breadcrumbKey] ?? BREADCRUMB_LIMITS['default'];
		const isNetworkError = origen === 'NETWORK';
		// No capturar call site para errores de red — el stack del reporter no aporta nada
		const sourceLocation = !isNetworkError && stack ? parseSourceLocation(stack) : null;
		const effectiveStack = isNetworkError ? null : (stack ?? captureCallSite());

		const payload = this.buildPayload({
			origen,
			mensaje: `HTTP ${status}: ${sanitizeUrl(url, this.isBrowser)}`,
			stackTrace: effectiveStack?.substring(0, 4000) ?? null,
			url: sanitizeUrl(url, this.isBrowser),
			httpMethod: method ?? null,
			httpStatus: status,
			errorCode: errorCode ?? null,
			severidad: status >= 500 || status === 0 ? 'CRITICAL' : 'ERROR',
			correlationId: correlationId ?? null,
			sourceLocation,
			requestBody: sanitizePayload(requestBody),
			responseBody: sanitizePayload(responseBody, 2000),
			breadcrumbCount: maxBreadcrumbs,
		});

		this.send(payload);
	}

	reportSlowRequest(
		method: string,
		url: string,
		status: number,
		durationMs: number,
		correlationId?: string,
	): void {
		if (!this.isBrowser || !this.canReport()) return;

		const dedupKey = `slow:${sanitizeUrl(url, this.isBrowser)}`;
		const now = Date.now();
		if (this.recentReports.has(dedupKey) &&
			now - this.recentReports.get(dedupKey)! < ErrorReporterService.DEDUP_WINDOW_MS) {
			return;
		}
		this.recentReports.set(dedupKey, now);

		const payload = this.buildPayload({
			origen: 'NETWORK',
			mensaje: `Slow request (${Math.round(durationMs)}ms): ${method} ${sanitizeUrl(url, this.isBrowser)}`,
			stackTrace: null,
			url: sanitizeUrl(url, this.isBrowser),
			httpMethod: method,
			httpStatus: status,
			errorCode: 'SLOW_REQUEST',
			severidad: 'WARNING',
			correlationId: correlationId ?? null,
			sourceLocation: null,
			breadcrumbCount: 5,
		});

		this.send(payload);
	}

	reportClientError(message: string, stack?: string, correlationId?: string): void {
		if (!this.isBrowser || !this.canReport()) return;

		const sourceLocation = stack ? parseSourceLocation(stack) : null;

		const payload = this.buildPayload({
			origen: 'FRONTEND',
			mensaje: message.substring(0, 500),
			stackTrace: stack?.substring(0, 4000) ?? null,
			url: this.isBrowser ? window.location.pathname : '/',
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

	private cleanRecentReports(now: number): void {
		if (this.recentReports.size > 20) {
			for (const [key, ts] of this.recentReports) {
				if (now - ts > ErrorReporterService.DEDUP_WINDOW_MS) {
					this.recentReports.delete(key);
				}
			}
		}
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
		requestBody?: string | null;
		responseBody?: string | null;
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
			plataforma: detectPlatform(this.isBrowser),
			userAgent: this.isBrowser ? navigator.userAgent.substring(0, 500) : 'SSR',
			sourceLocation: opts.sourceLocation
				? JSON.stringify(opts.sourceLocation).substring(0, 500)
				: null,
			requestBody: opts.requestBody ?? null,
			responseBody: opts.responseBody ?? null,
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

	// #region Envío con outbox offline

	private send(payload: ErrorReportPayload): void {
		const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });

		this.http
			.post(ErrorReporterService.ENDPOINT, payload, { headers })
			.subscribe({
				error: (err) => {
					// Never save 429 to outbox — retrying rate-limited requests makes it worse
					if (err?.status === 429) return;
					this.savePending(payload);
				},
			});
	}

	/**
	 * Escucha REVALIDATION_FAILED del Service Worker.
	 * Cuando el SW tiene cache y devuelve SWR, la revalidación en background falla
	 * pero Angular no ve error (recibió datos del cache). El SW nos notifica aquí.
	 * Un solo reporte NETWORK por ráfaga (dedup 10s).
	 */
	private lastSwFailureReport = 0;
	private static readonly SW_FAILURE_DEDUP_MS = 10_000;

	private listenSwRevalidationFailures(): void {
		if (!this.isBrowser || !('serviceWorker' in navigator)) return;

		navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
			if (event.data?.type !== 'REVALIDATION_FAILED') return;

			const now = Date.now();
			if (now - this.lastSwFailureReport < ErrorReporterService.SW_FAILURE_DEDUP_MS) return;
			this.lastSwFailureReport = now;

			const url = event.data.payload?.originalUrl ?? event.data.payload?.url ?? '';

			const payload = this.buildPayload({
				origen: 'NETWORK',
				mensaje: `Red no disponible: ${sanitizeUrl(url, this.isBrowser)}`,
				stackTrace: null,
				url: sanitizeUrl(url, this.isBrowser),
				httpMethod: 'GET',
				httpStatus: 0,
				errorCode: 'NETWORK_REVALIDATION_FAILED',
				severidad: 'WARNING',
				correlationId: null,
				sourceLocation: null,
				breadcrumbCount: 5,
			});

			// Guardar en outbox (no intentar enviar — no hay red)
			this.savePending(payload);
		});
	}

	/** Cuando vuelve la conexión, reintentar los pendientes */
	private listenOnline(): void {
		fromEvent(window, 'online')
			.pipe(
				debounceTime(3000),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				logger.warn('[ErrorReporter] Online detected — flushing outbox');
				this.flushPending();
			});
	}

	/** Envía todos los reportes pendientes en IndexedDB */
	private flushing = false;
	private async flushPending(): Promise<void> {
		if (this.flushing || !this.isBrowser || !navigator.onLine) return;
		this.flushing = true;
		try {
			const pending = await readPendingReports<ErrorReportPayload>();
			if (pending.length === 0) return;
			logger.warn(`[ErrorReporter] Flushing ${pending.length} pending error reports`);
			for (const { key, value } of pending) this.sendAndRemove(value, key);
		} finally {
			this.flushing = false;
		}
	}

	/** Envía un reporte pendiente y lo borra de IndexedDB si tiene éxito */
	private sendAndRemove(payload: ErrorReportPayload, key: number): void {
		const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });

		this.http
			.post(ErrorReporterService.ENDPOINT, payload, { headers })
			.subscribe({
				next: () => this.removePending(key),
				error: (err) => {
					// 429 = rate limited — remove from outbox to stop retry loop
					if (err?.status === 429) {
						this.removePending(key);
						return;
					}
					// Todavía sin conexión — se reintentará en el siguiente online
				},
			});
	}

	// #endregion

	// #region IndexedDB outbox (delegated)

	private savePending(payload: ErrorReportPayload): void {
		saveReportToOutbox(payload).then(() => logger.warn('[ErrorReporter] Error report saved to offline outbox'));
	}

	private removePending(id: number): void {
		removeReportFromOutbox(id);
	}

	// #endregion
}
