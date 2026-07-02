import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, debounceTime } from 'rxjs';

import { ActivityTrackerService } from './activity-tracker.service';
import { Breadcrumb } from './activity-tracker.models';
import { ClientMetricsBufferService } from './client-metrics-buffer.service';
import { saveReportToOutbox, readPendingReports, removeReportFromOutbox } from './error-reporter-outbox.helper';
import { createSwRevalidationListener } from './error-reporter-sw.helper';
import {
	type ErrorOrigen, type SourceLocation,
	classifyHttpOrigin, parseSourceLocation, captureCallSite,
	getBreadcrumbKey, sanitizeUrl, sanitizePayload, detectPlatform,
} from './error-reporter.helpers';
import { type ErrorReportPayload, type BreadcrumbPayload, type ClientEnvironmentSnapshot, BREADCRUMB_LIMITS } from './error-reporter.models';
import { environment } from '@config/environment';
import { logger } from '@core/helpers';

@Injectable({ providedIn: 'root' })
export class ErrorReporterService {
	private readonly http = inject(HttpClient);
	private readonly activityTracker = inject(ActivityTrackerService);
	private readonly metricsBuffer = inject(ClientMetricsBufferService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly isBrowser = typeof window !== 'undefined';

	private reportCount = 0;
	private resetTimer: ReturnType<typeof setTimeout> | null = null;
	private static readonly MAX_REPORTS_PER_MINUTE = 5;
	private static readonly ENDPOINT = `${environment.apiUrl}/api/sistema/errors`;
	private readonly recentReports = new Map<string, number>();
	private static readonly DEDUP_WINDOW_MS = 5_000;
	private flushInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		if (!this.isBrowser) return;
		this.listenOnline();
		const removeSw = createSwRevalidationListener(
			this.isBrowser,
			(opts) => this.buildPayload({
				origen: 'NETWORK', mensaje: `Red no disponible: ${opts.url}`,
				stackTrace: null, url: opts.url, httpMethod: 'GET', httpStatus: 0,
				errorCode: 'NETWORK_REVALIDATION_FAILED', severidad: 'WARNING',
				correlationId: null, sourceLocation: null, breadcrumbCount: 5,
			}),
			(p) => this.savePending(p),
		);
		this.flushPending();
		this.flushInterval = setInterval(() => this.flushPending(), 30_000);
		this.destroyRef.onDestroy(() => {
			if (this.flushInterval) clearInterval(this.flushInterval);
			removeSw?.();
		});
	}

	reportHttpError(
		status: number, url: string, method?: string, errorCode?: string,
		correlationId?: string, stack?: string, requestBody?: unknown, responseBody?: unknown,
	): void {
		if (!this.isBrowser || !this.canReport()) return;
		if (status === 429) return;
		if (url.includes('/api/sistema/errors')) return;

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
		const sourceLocation = !isNetworkError && stack ? parseSourceLocation(stack) : null;
		const effectiveStack = isNetworkError ? null : (stack ?? captureCallSite());

		this.send(this.buildPayload({
			origen,
			mensaje: `HTTP ${status}: ${sanitizeUrl(url, this.isBrowser)}`,
			stackTrace: effectiveStack?.substring(0, 4000) ?? null,
			url: sanitizeUrl(url, this.isBrowser),
			httpMethod: method ?? null, httpStatus: status,
			errorCode: errorCode ?? null,
			severidad: status >= 500 || status === 0 ? 'CRITICAL' : 'ERROR',
			correlationId: correlationId ?? null, sourceLocation,
			requestBody: sanitizePayload(requestBody),
			responseBody: sanitizePayload(responseBody, 1900),
			breadcrumbCount: maxBreadcrumbs,
		}));
	}

	reportSlowRequest(
		method: string, url: string, status: number, durationMs: number, correlationId?: string,
	): void {
		if (!this.isBrowser || !this.canReport()) return;
		const dedupKey = `slow:${sanitizeUrl(url, this.isBrowser)}`;
		const now = Date.now();
		if (this.recentReports.has(dedupKey) &&
			now - this.recentReports.get(dedupKey)! < ErrorReporterService.DEDUP_WINDOW_MS) {
			return;
		}
		this.recentReports.set(dedupKey, now);

		this.send(this.buildPayload({
			origen: 'NETWORK',
			mensaje: `Slow request (${Math.round(durationMs)}ms): ${method} ${sanitizeUrl(url, this.isBrowser)}`,
			stackTrace: null, url: sanitizeUrl(url, this.isBrowser),
			httpMethod: method, httpStatus: status,
			errorCode: 'SLOW_REQUEST', severidad: 'WARNING',
			correlationId: correlationId ?? null, sourceLocation: null, breadcrumbCount: 5,
		}));
	}

	reportClientError(message: string, stack?: string, correlationId?: string): void {
		if (!this.isBrowser || !this.canReport()) return;
		const sourceLocation = stack ? parseSourceLocation(stack) : null;

		this.send(this.buildPayload({
			origen: 'FRONTEND',
			mensaje: message.substring(0, 500),
			stackTrace: stack?.substring(0, 4000) ?? null,
			url: this.isBrowser ? window.location.pathname : '/',
			httpMethod: null, httpStatus: null, errorCode: null,
			severidad: 'CRITICAL', correlationId: correlationId ?? null,
			sourceLocation, breadcrumbCount: BREADCRUMB_LIMITS['js_unhandled'],
		}));
	}

	resetOnLogout(): void {
		this.recentReports.clear();
		this.reportCount = 0;
		if (this.resetTimer) {
			clearTimeout(this.resetTimer);
			this.resetTimer = null;
		}
	}

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
		for (const [key, ts] of this.recentReports) {
			if (now - ts > ErrorReporterService.DEDUP_WINDOW_MS) this.recentReports.delete(key);
		}
		if (this.recentReports.size > 100) this.recentReports.clear();
	}

	private buildPayload(opts: {
		origen: ErrorOrigen; mensaje: string; stackTrace: string | null;
		url: string; httpMethod: string | null; httpStatus: number | null;
		errorCode: string | null; severidad: 'CRITICAL' | 'ERROR' | 'WARNING';
		correlationId: string | null; sourceLocation: SourceLocation | null;
		requestBody?: string | null; responseBody?: string | null; breadcrumbCount: number;
	}): ErrorReportPayload {
		const breadcrumbs = this.activityTracker.getBreadcrumbs(opts.breadcrumbCount);
		return {
			correlationId: opts.correlationId, origen: opts.origen,
			mensaje: opts.mensaje, stackTrace: opts.stackTrace,
			url: opts.url, httpMethod: opts.httpMethod,
			httpStatus: opts.httpStatus, errorCode: opts.errorCode,
			severidad: opts.severidad,
			plataforma: detectPlatform(this.isBrowser),
			userAgent: this.isBrowser ? navigator.userAgent.substring(0, 500) : 'SSR',
			sourceLocation: opts.sourceLocation
				? JSON.stringify(opts.sourceLocation).substring(0, 500) : null,
			requestBody: opts.requestBody ?? null,
			responseBody: opts.responseBody ?? null,
			breadcrumbs: breadcrumbs.map(this.mapBreadcrumb),
			clientEnvironment: this.serializeClientEnvironment(),
		};
	}

	private serializeClientEnvironment(): string | null {
		if (!this.isBrowser) return null;
		const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
		const metrics = this.metricsBuffer.drain();
		const snapshot: ClientEnvironmentSnapshot = {
			viewport: { width: window.innerWidth, height: window.innerHeight },
			screen: { width: window.screen.width, height: window.screen.height },
			dpr: window.devicePixelRatio,
			connectionType: nav.connection?.effectiveType ?? null,
			capturedAt: new Date().toISOString(),
			metricsBuffer: metrics.length > 0 ? metrics : null,
		};
		return JSON.stringify(snapshot).substring(0, 2000);
	}

	private mapBreadcrumb(b: Breadcrumb): BreadcrumbPayload {
		return {
			tipo: b.tipo, descripcion: b.descripcion.substring(0, 500),
			ruta: b.ruta.substring(0, 200), timestamp: b.timestamp,
			metadata: b.metadata ? JSON.stringify(b.metadata).substring(0, 500) : null,
		};
	}

	private send(payload: ErrorReportPayload): void {
		const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
		this.http.post(ErrorReporterService.ENDPOINT, payload, { headers }).subscribe({
			error: (err) => {
				if (err?.status === 429) return;
				this.savePending(payload);
			},
		});
	}

	private listenOnline(): void {
		fromEvent(window, 'online').pipe(
			debounceTime(3000), takeUntilDestroyed(this.destroyRef),
		).subscribe(() => {
			logger.warn('[ErrorReporter] Online detected — flushing outbox');
			this.flushPending();
		});
	}

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

	private sendAndRemove(payload: ErrorReportPayload, key: number): void {
		const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
		this.http.post(ErrorReporterService.ENDPOINT, payload, { headers }).subscribe({
			next: () => this.removePending(key),
			error: (err) => {
				if (err?.status === 429) { this.removePending(key); return; }
			},
		});
	}

	private savePending(payload: ErrorReportPayload): void {
		saveReportToOutbox(payload).then(() => logger.warn('[ErrorReporter] Error report saved to offline outbox'));
	}

	private removePending(id: number): void {
		removeReportFromOutbox(id);
	}
}
