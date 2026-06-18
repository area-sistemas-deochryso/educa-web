import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';
import { StorageService } from '@core/services';

import {
	HistoryTimeRange,
	resolveResolution,
	resolveTimeRange,
} from '../models/runtime-health.models';

import { RuntimeHealthService } from './runtime-health.service';
import { RuntimeHealthStore } from './runtime-health.store';

const POLL_INTERVAL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class RuntimeHealthFacade {
	// #region Dependencias
	private readonly api = inject(RuntimeHealthService);
	private readonly store = inject(RuntimeHealthStore);
	private readonly storage = inject(StorageService);
	private readonly destroyRef = inject(DestroyRef);

	private pollHandle: ReturnType<typeof setInterval> | null = null;
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	readonly historyVm = this.store.historyVm;
	// #endregion

	constructor() {
		this.destroyRef.onDestroy(() => this.stopPolling());
	}

	// #region Comandos públicos — live snapshot
	init(): void {
		const autoRefresh = this.storage.getRuntimeHealthWidgetAutoRefresh();
		const collapsed = this.storage.getRuntimeHealthWidgetCollapsed();
		this.store.setAutoRefresh(autoRefresh);
		this.store.setCollapsed(collapsed);

		this.load();
		if (autoRefresh) this.startPolling();
	}

	load(): void {
		this.store.setLoading(true);
		this.api
			.getSnapshot()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (snapshot) => {
					this.store.setSnapshot(snapshot);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.tagged('RuntimeHealthFacade', 'error', 'load failed', err);
					this.store.setError('No se pudo cargar el estado del runtime');
					this.store.setLoading(false);
				},
			});
	}

	setAutoRefresh(enabled: boolean): void {
		this.store.setAutoRefresh(enabled);
		this.storage.setRuntimeHealthWidgetAutoRefresh(enabled);
		if (enabled) this.startPolling();
		else this.stopPolling();
	}

	setCollapsed(collapsed: boolean): void {
		this.store.setCollapsed(collapsed);
		this.storage.setRuntimeHealthWidgetCollapsed(collapsed);
	}
	// #endregion

	// #region Comandos públicos — history
	loadHistory(): void {
		const range = this.store.timeRange();
		const { from, to } = resolveTimeRange(range);
		const resolution = resolveResolution(range);

		this.store.setHistoryLoading(true);
		this.api
			.getHistory(from, to, resolution)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					this.store.setHistoryData(response.data);
					this.store.setHistoryLoading(false);
				},
				error: (err) => {
					logger.tagged('RuntimeHealthFacade', 'error', 'history load failed', err);
					this.store.setHistoryError('No se pudo cargar el historial');
					this.store.setHistoryLoading(false);
				},
			});
	}

	setTimeRange(range: HistoryTimeRange): void {
		this.store.setTimeRange(range);
		this.loadHistory();
	}
	// #endregion

	// #region Polling
	private startPolling(): void {
		if (this.pollHandle) return;
		this.pollHandle = setInterval(() => this.load(), POLL_INTERVAL_MS);
	}

	private stopPolling(): void {
		if (this.pollHandle) {
			clearInterval(this.pollHandle);
			this.pollHandle = null;
		}
	}
	// #endregion
}
