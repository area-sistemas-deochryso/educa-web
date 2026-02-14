import { Injectable, computed, signal } from '@angular/core';
import { compileDebugFilter } from '@core/helpers';
import type { RequestTraceEntry } from './request-trace.models';

/**
 * Store for request tracing state.
 * Keeps recent HTTP entries and exposes a view model for UI.
 */
@Injectable({ providedIn: 'root' })
export class RequestTraceStore {
	// #region Private state
	private readonly _entries = signal<RequestTraceEntry[]>([]);
	private readonly _enabled = signal(true);
	private readonly _isDev = signal(false);
	private readonly _filter = signal('');
	private readonly _maxEntries = signal(200);

	// #endregion
	// #region Public reads
	readonly entries = this._entries.asReadonly();
	readonly enabled = this._enabled.asReadonly();
	readonly isDev = this._isDev.asReadonly();
	readonly filter = this._filter.asReadonly();
	readonly maxEntries = this._maxEntries.asReadonly();

	readonly filteredEntries = computed(() => {
		const pattern = this._filter().trim();
		if (!pattern) return this._entries();

		const filterFn = compileDebugFilter(pattern);
		return this._entries().filter((entry) =>
			filterFn(`${entry.method} ${entry.url}`),
		);
	});

	readonly stats = computed(() => {
		const entries = this._entries();
		const total = entries.length;
		const failed = entries.filter((e) => !e.ok).length;
		const avgMs =
			total === 0
				? 0
				: Math.round(
						(entries.reduce((sum, e) => sum + e.durationMs, 0) / total) * 100,
					) / 100;

		return { total, failed, avgMs };
	});

	readonly vm = computed(() => ({
		isDev: this._isDev(),
		enabled: this._enabled(),
		filter: this._filter(),
		maxEntries: this._maxEntries(),
		entries: this.filteredEntries(),
		stats: this.stats(),
	}));

	// #endregion
	// #region Mutations
	setEnabled(enabled: boolean): void {
		this._enabled.set(enabled);
	}

	setIsDev(isDev: boolean): void {
		this._isDev.set(isDev);
	}

	setFilter(pattern: string): void {
		this._filter.set(pattern);
	}

	setMaxEntries(maxEntries: number): void {
		this._maxEntries.set(Math.max(1, Math.floor(maxEntries)));
	}

	addEntry(entry: RequestTraceEntry): void {
		const max = this._maxEntries();
		this._entries.update((entries) => {
			const next = [...entries, entry];
			return next.length > max ? next.slice(-max) : next;
		});
	}

	clear(): void {
		this._entries.set([]);
	}
	// #endregion
}
