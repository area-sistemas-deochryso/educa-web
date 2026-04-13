// #region Imports
import { inject, Inject, Injectable, Optional, isDevMode } from '@angular/core';
import { environment } from '@config';
import {
	compileDebugFilter,
	safeGetLocalStorage,
	safeRemoveLocalStorage,
	safeSetLocalStorage,
} from '@core/helpers';

import {
	REQUEST_TRACE_CONFIG,
	RequestTraceConfig,
	RequestTraceEntry,
} from './request-trace.models';
import { RequestTraceStore } from './request-trace.store';

// #endregion
// #region Implementation
const DEFAULTS: Required<RequestTraceConfig> = {
	enabled: true,
	maxEntries: 200,
	defaultPattern: '',
	storageKey: 'TRACE_HTTP',
	storageMaxKey: 'TRACE_HTTP_MAX',
	storageEnabledKey: 'TRACE_HTTP_ENABLED',
};

/**
 * Facade para configuración y registro de trazas HTTP.
 * Solo activo en modo desarrollo.
 */
@Injectable({ providedIn: 'root' })
export class RequestTraceFacade {
	private readonly store = inject(RequestTraceStore);
	private cfg: Required<RequestTraceConfig>;
	private filterFn: (tag: string) => boolean = () => true;

	readonly vm = this.store.vm;

	/**
	 * Ring buffer de los últimos request IDs generados por el trace interceptor.
	 * Funciona en prod + dev — el interceptor llama a `trackLastRequestId` independiente
	 * del modo. Sirve para correlacionar reportes manuales con el último trazo automático.
	 */
	private lastRequestIds: string[] = [];
	private static readonly MAX_RECENT = 5;

	/**
	 * Ring buffer de correlation IDs de errores que el usuario VIO (notificación toast,
	 * modal de error, etc.). Es distinto al `lastRequestIds` — aquí solo entran IDs
	 * cuyo request disparó una notificación visible. Tiene prioridad sobre
	 * `getLastRequestId()` cuando el usuario abre el dialog de reporte, porque lo más
	 * probable es que esté reportando ese error puntual.
	 */
	private visibleErrors: { id: string; timestamp: number }[] = [];
	private static readonly MAX_VISIBLE_ERRORS = 5;

	constructor(
		@Optional() @Inject(REQUEST_TRACE_CONFIG) cfg?: RequestTraceConfig,
	) {
		this.cfg = { ...DEFAULTS, ...(cfg ?? {}) };
		this.refreshFromStorage();
	}

	get isDev(): boolean {
		return isDevMode() && !environment.production;
	}

	get isEnabled(): boolean {
		return this.isDev && this.store.enabled();
	}

	/**
	 * Genera un ID de request para correlación.
	 */
	newRequestId(): string {
		if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
			return crypto.randomUUID();
		}
		return `req_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
	}

	/**
	 * Registra el último request ID generado por el trace interceptor.
	 * Se llama en TODAS las requests (prod + dev) para permitir correlación
	 * con reportes manuales del usuario.
	 */
	trackLastRequestId(id: string): void {
		this.lastRequestIds.push(id);
		if (this.lastRequestIds.length > RequestTraceFacade.MAX_RECENT) {
			this.lastRequestIds.shift();
		}
	}

	/**
	 * Retorna el ID de la última request vista, o null si no hay ninguna aún.
	 * Útil para atar un reporte manual del usuario a la última llamada HTTP real.
	 */
	getLastRequestId(): string | null {
		return this.lastRequestIds.length === 0
			? null
			: this.lastRequestIds[this.lastRequestIds.length - 1];
	}

	/**
	 * Registra que el usuario vio un error (notificación toast/modal).
	 * Se llama desde `ErrorHandlerService` cada vez que se muestra una notificación
	 * de error con su correlation ID asociado.
	 */
	trackVisibleError(correlationId: string): void {
		if (!correlationId) return;
		this.visibleErrors.push({ id: correlationId, timestamp: Date.now() });
		if (this.visibleErrors.length > RequestTraceFacade.MAX_VISIBLE_ERRORS) {
			this.visibleErrors.shift();
		}
	}

	/**
	 * Retorna el correlation ID del error visible más reciente dentro de la ventana
	 * temporal indicada, o null si no hay ninguno. El dialog de feedback lo usa para
	 * detectar "el usuario acaba de ver un error, seguro lo está reportando".
	 */
	getRecentVisibleErrorId(windowMs: number): string | null {
		if (this.visibleErrors.length === 0) return null;
		const last = this.visibleErrors[this.visibleErrors.length - 1];
		return Date.now() - last.timestamp <= windowMs ? last.id : null;
	}

	shouldTrace(method: string, url: string): boolean {
		if (!this.isEnabled) return false;
		return this.filterFn(`${method} ${url}`);
	}

	record(entry: RequestTraceEntry): void {
		if (!this.isEnabled) return;
		if (!this.filterFn(`${entry.method} ${entry.url}`)) return;
		this.store.addEntry(entry);
	}

	// #region Configuración
	setEnabled(enabled: boolean, persist = true): void {
		this.store.setEnabled(enabled);
		if (persist) {
			safeSetLocalStorage(this.cfg.storageEnabledKey, String(enabled));
		}
	}

	setFilter(pattern: string, persist = true): void {
		const normalized = (pattern ?? '').trim();
		this.store.setFilter(normalized);
		this.filterFn = compileDebugFilter(normalized);

		if (persist) {
			if (!normalized) {
				safeRemoveLocalStorage(this.cfg.storageKey);
			} else {
				safeSetLocalStorage(this.cfg.storageKey, normalized);
			}
		}
	}

	setMaxEntries(maxEntries: number, persist = true): void {
		this.store.setMaxEntries(maxEntries);
		if (persist) {
			safeSetLocalStorage(this.cfg.storageMaxKey, String(maxEntries));
		}
	}

	clear(): void {
		this.store.clear();
	}

	refreshFromStorage(): void {
		const isDev = this.isDev;
		this.store.setIsDev(isDev);

		const rawEnabled = safeGetLocalStorage(this.cfg.storageEnabledKey);
		const enabled =
			rawEnabled === null ? this.cfg.enabled : rawEnabled.trim().toLowerCase() === 'true';
		this.store.setEnabled(enabled);

		const rawPattern = safeGetLocalStorage(this.cfg.storageKey);
		const pattern = (rawPattern ?? this.cfg.defaultPattern).trim();
		this.store.setFilter(pattern);
		this.filterFn = compileDebugFilter(pattern);

		const rawMax = safeGetLocalStorage(this.cfg.storageMaxKey);
		const parsedMax = rawMax ? Number.parseInt(rawMax, 10) : NaN;
		this.store.setMaxEntries(Number.isFinite(parsedMax) ? parsedMax : this.cfg.maxEntries);
	}

	clearOverrides(): void {
		safeRemoveLocalStorage(this.cfg.storageKey);
		safeRemoveLocalStorage(this.cfg.storageMaxKey);
		safeRemoveLocalStorage(this.cfg.storageEnabledKey);
		this.refreshFromStorage();
	}
	// #endregion
}
// #endregion
