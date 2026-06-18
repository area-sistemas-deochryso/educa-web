import { Injectable, computed, signal } from '@angular/core';

import {
	ForceGcResult,
	HistoryTimeRange,
	RuntimeHealthAlert,
	RuntimeHealthHistoryDto,
	RuntimeHealthSnapshot,
	SlowRequestEntry,
	ThresholdConfig,
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

	// #region Estado privado — alerts & thresholds (F3)
	private readonly _alerts = signal<RuntimeHealthAlert[]>([]);
	private readonly _alertsLoading = signal(false);
	private readonly _thresholds = signal<ThresholdConfig[]>([]);
	private readonly _thresholdsLoading = signal(false);
	private readonly _thresholdsSaving = signal(false);
	// #endregion

	// #region Estado privado — diagnostics (F4)
	private readonly _slowRequests = signal<SlowRequestEntry[]>([]);
	private readonly _slowRequestsLoading = signal(false);
	private readonly _forceGcResult = signal<ForceGcResult | null>(null);
	private readonly _forceGcLoading = signal(false);
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

	readonly alerts = this._alerts.asReadonly();
	readonly alertsLoading = this._alertsLoading.asReadonly();
	readonly thresholds = this._thresholds.asReadonly();
	readonly thresholdsLoading = this._thresholdsLoading.asReadonly();
	readonly thresholdsSaving = this._thresholdsSaving.asReadonly();

	readonly slowRequests = this._slowRequests.asReadonly();
	readonly slowRequestsLoading = this._slowRequestsLoading.asReadonly();
	readonly forceGcResult = this._forceGcResult.asReadonly();
	readonly forceGcLoading = this._forceGcLoading.asReadonly();

	readonly alertsVm = computed(() => ({
		alerts: this._alerts(),
		loading: this._alertsLoading(),
	}));

	readonly thresholdsVm = computed(() => ({
		thresholds: this._thresholds(),
		loading: this._thresholdsLoading(),
		saving: this._thresholdsSaving(),
	}));

	readonly diagnosticsVm = computed(() => ({
		slowRequests: this._slowRequests(),
		slowRequestsLoading: this._slowRequestsLoading(),
		forceGcResult: this._forceGcResult(),
		forceGcLoading: this._forceGcLoading(),
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

	// #region Comandos — alerts & thresholds (F3)
	setAlerts(alerts: RuntimeHealthAlert[]): void {
		this._alerts.set(alerts);
	}

	setAlertsLoading(loading: boolean): void {
		this._alertsLoading.set(loading);
	}

	setThresholds(thresholds: ThresholdConfig[]): void {
		this._thresholds.set(thresholds);
	}

	setThresholdsLoading(loading: boolean): void {
		this._thresholdsLoading.set(loading);
	}

	setThresholdsSaving(saving: boolean): void {
		this._thresholdsSaving.set(saving);
	}
	// #endregion

	// #region Comandos — diagnostics (F4)
	setSlowRequests(entries: SlowRequestEntry[]): void {
		this._slowRequests.set(entries);
	}

	setSlowRequestsLoading(loading: boolean): void {
		this._slowRequestsLoading.set(loading);
	}

	setForceGcResult(result: ForceGcResult | null): void {
		this._forceGcResult.set(result);
	}

	setForceGcLoading(loading: boolean): void {
		this._forceGcLoading.set(loading);
	}
	// #endregion
}
