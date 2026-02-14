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
 * Facade for request tracing configuration + recording.
 * Only active in dev mode.
 */
@Injectable({ providedIn: 'root' })
export class RequestTraceFacade {
	private readonly store = inject(RequestTraceStore);
	private cfg: Required<RequestTraceConfig>;
	private filterFn: (tag: string) => boolean = () => true;

	readonly vm = this.store.vm;

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
	 * Generates a request id for correlation.
	 */
	newRequestId(): string {
		if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
			return crypto.randomUUID();
		}
		return `req_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
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

	// ---------------- Config ----------------
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
}
// #endregion
