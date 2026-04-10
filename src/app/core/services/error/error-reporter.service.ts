import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, filter, debounceTime } from 'rxjs';

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

const DB_NAME = 'educa-error-outbox';
const STORE_NAME = 'pending';
const DB_VERSION = 1;
const MAX_PENDING = 50;

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
	): void {
		if (!this.isBrowser || !this.canReport()) return;

		// Dedup: no reportar la misma URL + status en <5s (errores en cascada)
		const dedupKey = `${status}:${this.sanitizeUrl(url)}`;
		const now = Date.now();
		if (this.recentReports.has(dedupKey) &&
			now - this.recentReports.get(dedupKey)! < ErrorReporterService.DEDUP_WINDOW_MS) {
			return;
		}
		this.recentReports.set(dedupKey, now);
		this.cleanRecentReports(now);

		const origen = this.classifyHttpOrigin(status);
		const breadcrumbKey = this.getBreadcrumbKey(status);
		const maxBreadcrumbs = BREADCRUMB_LIMITS[breadcrumbKey] ?? BREADCRUMB_LIMITS['default'];
		const sourceLocation = stack ? this.parseSourceLocation(stack) : null;

		const effectiveStack = stack ?? this.captureCallSite();

		const payload = this.buildPayload({
			origen,
			mensaje: `HTTP ${status}: ${this.sanitizeUrl(url)}`,
			stackTrace: effectiveStack?.substring(0, 4000) ?? null,
			url: this.sanitizeUrl(url),
			httpMethod: method ?? null,
			httpStatus: status,
			errorCode: errorCode ?? null,
			severidad: status >= 500 || status === 0 ? 'CRITICAL' : 'ERROR',
			correlationId: correlationId ?? null,
			sourceLocation,
			breadcrumbCount: maxBreadcrumbs,
		});

		this.send(payload);
	}

	reportClientError(message: string, stack?: string, correlationId?: string): void {
		if (!this.isBrowser || !this.canReport()) return;

		const sourceLocation = stack ? this.parseSourceLocation(stack) : null;

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

	// #region Clasificación de origen

	/**
	 * Determina el VERDADERO origen del error:
	 * - status 0 → NETWORK (request nunca llegó al servidor — DNS, timeout, sin red)
	 * - 408, 502, 503, 504 → NETWORK (servidor no respondió a tiempo)
	 * - navigator.onLine === false → NETWORK (sin conexión de red)
	 * - 500+ → BACKEND (el servidor respondió con error)
	 * - 4xx → FRONTEND (el frontend envió algo incorrecto)
	 */
	private classifyHttpOrigin(status: number): ErrorOrigen {
		// Status 0 = el request nunca llegó: sin red, DNS fail, CORS block, timeout total
		if (status === 0) return 'NETWORK';
		// Gateway/proxy errors = el servidor no respondió
		if (status === 408 || status === 502 || status === 503 || status === 504) return 'NETWORK';
		// navigator.onLine como señal adicional (no confiable solo, pero sumada al status refuerza)
		if (this.isBrowser && !navigator.onLine) return 'NETWORK';
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
			userAgent: this.isBrowser ? navigator.userAgent.substring(0, 500) : 'SSR',
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

	// #region Envío con outbox offline

	private send(payload: ErrorReportPayload): void {
		const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });

		this.http
			.post(ErrorReporterService.ENDPOINT, payload, { headers })
			.subscribe({
				error: () => {
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
				mensaje: `Red no disponible: ${this.sanitizeUrl(url)}`,
				stackTrace: null,
				url: this.sanitizeUrl(url),
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
			const db = await this.openDb();
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);

			// Obtener keys + values para poder borrar por key después
			const keys = await this.idbRequest<IDBValidKey[]>(store.getAllKeys());
			const values = await this.idbRequest<ErrorReportPayload[]>(store.getAll());
			db.close();

			if (keys.length === 0) { this.flushing = false; return; }
			logger.warn(`[ErrorReporter] Flushing ${keys.length} pending error reports`);

			for (let i = 0; i < keys.length; i++) {
				this.sendAndRemove(values[i], keys[i] as number);
			}
		} catch {
			// IndexedDB no disponible
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
				error: () => {
					// Todavía sin conexión — se reintentará en el siguiente online
				},
			});
	}

	// #endregion

	// #region IndexedDB outbox

	private async savePending(payload: ErrorReportPayload): Promise<void> {
		try {
			const db = await this.openDb();
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);

			// Limitar a MAX_PENDING para no llenar el storage
			const count = await this.idbRequest<number>(store.count());
			if (count >= MAX_PENDING) {
				db.close();
				return;
			}

			store.add(payload);
			await this.idbTransaction(tx);
			db.close();
			logger.warn('[ErrorReporter] Error report saved to offline outbox');
		} catch {
			// IndexedDB no disponible — se pierde silenciosamente (INV-ET07)
		}
	}

	private async removePending(id: number): Promise<void> {
		try {
			const db = await this.openDb();
			const tx = db.transaction(STORE_NAME, 'readwrite');
			tx.objectStore(STORE_NAME).delete(id);
			await this.idbTransaction(tx);
			db.close();
		} catch {
			// Ignorar
		}
	}

	private openDb(): Promise<IDBDatabase> {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
				}
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	private idbRequest<T>(req: IDBRequest<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => reject(req.error);
		});
	}

	private idbTransaction(tx: IDBTransaction): Promise<void> {
		return new Promise((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error);
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
			const origin = this.isBrowser ? window.location.origin : 'http://localhost';
			const parsed = new URL(url, origin);
			return parsed.pathname.substring(0, 500);
		} catch {
			return url.split('?')[0].substring(0, 500);
		}
	}

	private detectPlatform(): 'WEB' | 'ANDROID' | 'IOS' {
		if (!this.isBrowser) return 'WEB';
		const ua = navigator.userAgent.toLowerCase();
		if (ua.includes('android') && ua.includes('capacitor')) return 'ANDROID';
		if ((ua.includes('iphone') || ua.includes('ipad')) && ua.includes('capacitor')) return 'IOS';
		return 'WEB';
	}

	// #endregion
}
