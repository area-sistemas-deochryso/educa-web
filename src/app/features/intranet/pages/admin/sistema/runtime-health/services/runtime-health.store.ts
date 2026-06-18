import { Injectable, computed, signal } from '@angular/core';

import {
	HistoryTimeRange,
	RuntimeHealthHistoryDto,
	RuntimeHealthSnapshot,
} from '../models/runtime-health.models';

@Injectable({ providedIn: 'root' })
export class RuntimeHealthStore {
	// #region Estado privado — live snapshot
	private readonly _snapshot = signal<RuntimeHealthSnapshot | null>(null);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _autoRefresh = signal(true);
	private readonly _collapsed = signal(false);
	// #endregion

	// #region Estado privado — history
	private readonly _historyData = signal<RuntimeHealthHistoryDto[]>([]);
	private readonly _historyLoading = signal(false);
	private readonly _historyError = signal<string | null>(null);
	private readonly _timeRange = signal<HistoryTimeRange>('1h');
	// #endregion

	// #region Lecturas públicas
	readonly snapshot = this._snapshot.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly autoRefresh = this._autoRefresh.asReadonly();
	readonly collapsed = this._collapsed.asReadonly();

	readonly historyData = this._historyData.asReadonly();
	readonly historyLoading = this._historyLoading.asReadonly();
	readonly historyError = this._historyError.asReadonly();
	readonly timeRange = this._timeRange.asReadonly();

	readonly vm = computed(() => ({
		snapshot: this._snapshot(),
		loading: this._loading(),
		error: this._error(),
		autoRefresh: this._autoRefresh(),
		collapsed: this._collapsed(),
	}));

	readonly historyVm = computed(() => ({
		data: this._historyData(),
		loading: this._historyLoading(),
		error: this._historyError(),
		timeRange: this._timeRange(),
	}));
	// #endregion

	// #region Comandos — live snapshot
	setSnapshot(snapshot: RuntimeHealthSnapshot): void {
		this._snapshot.set(snapshot);
		this._error.set(null);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	setAutoRefresh(value: boolean): void {
		this._autoRefresh.set(value);
	}

	setCollapsed(value: boolean): void {
		this._collapsed.set(value);
	}
	// #endregion

	// #region Comandos — history
	setHistoryData(data: RuntimeHealthHistoryDto[]): void {
		this._historyData.set(data);
		this._historyError.set(null);
	}

	setHistoryLoading(loading: boolean): void {
		this._historyLoading.set(loading);
	}

	setHistoryError(error: string | null): void {
		this._historyError.set(error);
	}

	setTimeRange(range: HistoryTimeRange): void {
		this._timeRange.set(range);
	}
	// #endregion
}
