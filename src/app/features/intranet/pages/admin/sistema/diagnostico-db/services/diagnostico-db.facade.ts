import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';

import { DiagnosticoDbService } from './diagnostico-db.service';
import { DiagnosticoDbStore } from './diagnostico-db.store';

const RESOURCE_STATS_LAST_MINUTES = 60;
const POLL_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class DiagnosticoDbFacade {
	// #region Dependencias
	private readonly api = inject(DiagnosticoDbService);
	private readonly store = inject(DiagnosticoDbStore);
	private readonly destroyRef = inject(DestroyRef);

	private pollHandle: ReturnType<typeof setInterval> | null = null;
	// #endregion

	// #region Estado expuesto
	readonly resourceStatsVm = this.store.resourceStatsVm;
	readonly topQueriesVm = this.store.topQueriesVm;
	readonly activeBlockingVm = this.store.activeBlockingVm;
	readonly storageVm = this.store.storageVm;
	readonly tableSizesVm = this.store.tableSizesVm;
	readonly missingIndexesVm = this.store.missingIndexesVm;
	readonly indexFragmentationVm = this.store.indexFragmentationVm;
	readonly unusedIndexesVm = this.store.unusedIndexesVm;
	readonly identityValuesVm = this.store.identityValuesVm;
	// #endregion

	constructor() {
		this.destroyRef.onDestroy(() => this.stopPolling());
	}

	// #region Comandos públicos
	init(): void {
		this.loadResourceStats();
		this.loadTopQueries();
		this.loadActiveBlocking();
		this.loadStorage();
		this.loadTableSizes();
		this.loadMissingIndexes();
		this.loadIndexFragmentation();
		this.loadUnusedIndexes();
		this.loadIdentityValues();
		this.startPolling();
	}

	loadResourceStats(): void {
		this.store.setResourceStatsLoading(true);
		this.api
			.getResourceStats(RESOURCE_STATS_LAST_MINUTES)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setResourceStats(data);
					this.store.setResourceStatsLoading(false);
				},
				error: (err) => {
					logger.tagged('DiagnosticoDbFacade', 'error', 'resource-stats load failed', err);
					this.store.setResourceStatsError('No se pudo cargar el uso de recursos');
					this.store.setResourceStatsLoading(false);
				},
			});
	}

	loadTopQueries(top = 10): void {
		this.store.setTopQueriesLoading(true);
		this.api
			.getTopQueries(top)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setTopQueries(data);
					this.store.setTopQueriesLoading(false);
				},
				error: (err) => {
					logger.tagged('DiagnosticoDbFacade', 'error', 'top-queries load failed', err);
					this.store.setTopQueriesError('No se pudo cargar el top de consultas');
					this.store.setTopQueriesLoading(false);
				},
			});
	}

	loadActiveBlocking(): void {
		this.store.setActiveBlockingLoading(true);
		this.api
			.getActiveBlocking()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setActiveBlocking(data);
					this.store.setActiveBlockingLoading(false);
				},
				error: (err) => {
					logger.tagged('DiagnosticoDbFacade', 'error', 'active-blocking load failed', err);
					this.store.setActiveBlockingError('No se pudo cargar los bloqueos activos');
					this.store.setActiveBlockingLoading(false);
				},
			});
	}

	loadStorage(): void {
		this.store.setStorageLoading(true);
		this.api
			.getStorage()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setStorage(data);
					this.store.setStorageLoading(false);
				},
				error: (err) => {
					logger.tagged('DiagnosticoDbFacade', 'error', 'storage load failed', err);
					this.store.setStorageError('No se pudo cargar el estado del almacenamiento');
					this.store.setStorageLoading(false);
				},
			});
	}

	loadTableSizes(): void {
		this.store.setTableSizesLoading(true);
		this.api
			.getTableSizes()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setTableSizes(data);
					this.store.setTableSizesLoading(false);
				},
				error: (err) => {
					logger.tagged('DiagnosticoDbFacade', 'error', 'table-sizes load failed', err);
					this.store.setTableSizesError('No se pudo cargar el tamaño de las tablas');
					this.store.setTableSizesLoading(false);
				},
			});
	}

	loadMissingIndexes(): void {
		this.store.setMissingIndexesLoading(true);
		this.api
			.getMissingIndexes()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setMissingIndexes(data);
					this.store.setMissingIndexesLoading(false);
				},
				error: (err) => {
					logger.tagged('DiagnosticoDbFacade', 'error', 'missing-indexes load failed', err);
					this.store.setMissingIndexesError('No se pudo cargar los índices sugeridos');
					this.store.setMissingIndexesLoading(false);
				},
			});
	}

	loadIndexFragmentation(): void {
		this.store.setIndexFragmentationLoading(true);
		this.api
			.getIndexFragmentation()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setIndexFragmentation(data);
					this.store.setIndexFragmentationLoading(false);
				},
				error: (err) => {
					logger.tagged('DiagnosticoDbFacade', 'error', 'index-fragmentation load failed', err);
					this.store.setIndexFragmentationError('No se pudo cargar la fragmentación de índices');
					this.store.setIndexFragmentationLoading(false);
				},
			});
	}

	loadUnusedIndexes(): void {
		this.store.setUnusedIndexesLoading(true);
		this.api
			.getUnusedIndexes()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setUnusedIndexes(data);
					this.store.setUnusedIndexesLoading(false);
				},
				error: (err) => {
					logger.tagged('DiagnosticoDbFacade', 'error', 'unused-indexes load failed', err);
					this.store.setUnusedIndexesError('No se pudo cargar los índices sin uso');
					this.store.setUnusedIndexesLoading(false);
				},
			});
	}

	loadIdentityValues(): void {
		this.store.setIdentityValuesLoading(true);
		this.api
			.getIdentityValues()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setIdentityValues(data);
					this.store.setIdentityValuesLoading(false);
				},
				error: (err) => {
					logger.tagged('DiagnosticoDbFacade', 'error', 'identity-values load failed', err);
					this.store.setIdentityValuesError('No se pudo cargar los valores de identidad');
					this.store.setIdentityValuesLoading(false);
				},
			});
	}
	// #endregion

	// #region Polling — resource stats + active blocking, cada 30s
	private startPolling(): void {
		if (this.pollHandle) return;
		this.pollHandle = setInterval(() => {
			this.loadResourceStats();
			this.loadActiveBlocking();
		}, POLL_INTERVAL_MS);
	}

	private stopPolling(): void {
		if (this.pollHandle) {
			clearInterval(this.pollHandle);
			this.pollHandle = null;
		}
	}
	// #endregion
}
