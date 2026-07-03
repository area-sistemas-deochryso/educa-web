import { Injectable, computed, signal } from '@angular/core';

import {
	ActiveBlockingSessionDto,
	DatabaseFileStatsDto,
	ResourceStatsSnapshotDto,
	TableSizeDto,
	TopQueryDto,
} from '../models/diagnostico-db.models';

@Injectable({ providedIn: 'root' })
export class DiagnosticoDbStore {
	// #region Estado privado — resource stats
	private readonly _resourceStats = signal<ResourceStatsSnapshotDto[]>([]);
	private readonly _resourceStatsLoading = signal(false);
	private readonly _resourceStatsError = signal<string | null>(null);
	// #endregion

	// #region Estado privado — top queries
	private readonly _topQueries = signal<TopQueryDto[]>([]);
	private readonly _topQueriesLoading = signal(false);
	private readonly _topQueriesError = signal<string | null>(null);
	// #endregion

	// #region Estado privado — active blocking
	private readonly _activeBlocking = signal<ActiveBlockingSessionDto[]>([]);
	private readonly _activeBlockingLoading = signal(false);
	private readonly _activeBlockingError = signal<string | null>(null);
	// #endregion

	// #region Estado privado — storage
	private readonly _storage = signal<DatabaseFileStatsDto[]>([]);
	private readonly _storageLoading = signal(false);
	private readonly _storageError = signal<string | null>(null);
	// #endregion

	// #region Estado privado — table sizes
	private readonly _tableSizes = signal<TableSizeDto[]>([]);
	private readonly _tableSizesLoading = signal(false);
	private readonly _tableSizesError = signal<string | null>(null);
	// #endregion

	// #region Lecturas públicas — resource stats
	readonly resourceStatsVm = computed(() => ({
		data: this._resourceStats(),
		loading: this._resourceStatsLoading(),
		error: this._resourceStatsError(),
	}));
	// #endregion

	// #region Lecturas públicas — top queries
	readonly topQueriesVm = computed(() => ({
		data: this._topQueries(),
		loading: this._topQueriesLoading(),
		error: this._topQueriesError(),
	}));
	// #endregion

	// #region Lecturas públicas — active blocking
	readonly activeBlockingVm = computed(() => ({
		data: this._activeBlocking(),
		loading: this._activeBlockingLoading(),
		error: this._activeBlockingError(),
	}));
	// #endregion

	// #region Lecturas públicas — storage
	readonly storageVm = computed(() => ({
		data: this._storage(),
		loading: this._storageLoading(),
		error: this._storageError(),
	}));
	// #endregion

	// #region Lecturas públicas — table sizes
	readonly tableSizesVm = computed(() => ({
		data: this._tableSizes(),
		loading: this._tableSizesLoading(),
		error: this._tableSizesError(),
	}));
	// #endregion

	// #region Comandos — resource stats
	setResourceStats(data: ResourceStatsSnapshotDto[]): void {
		this._resourceStats.set(data);
		this._resourceStatsError.set(null);
	}

	setResourceStatsLoading(loading: boolean): void {
		this._resourceStatsLoading.set(loading);
	}

	setResourceStatsError(error: string | null): void {
		this._resourceStatsError.set(error);
	}
	// #endregion

	// #region Comandos — top queries
	setTopQueries(data: TopQueryDto[]): void {
		this._topQueries.set(data);
		this._topQueriesError.set(null);
	}

	setTopQueriesLoading(loading: boolean): void {
		this._topQueriesLoading.set(loading);
	}

	setTopQueriesError(error: string | null): void {
		this._topQueriesError.set(error);
	}
	// #endregion

	// #region Comandos — active blocking
	setActiveBlocking(data: ActiveBlockingSessionDto[]): void {
		this._activeBlocking.set(data);
		this._activeBlockingError.set(null);
	}

	setActiveBlockingLoading(loading: boolean): void {
		this._activeBlockingLoading.set(loading);
	}

	setActiveBlockingError(error: string | null): void {
		this._activeBlockingError.set(error);
	}
	// #endregion

	// #region Comandos — storage
	setStorage(data: DatabaseFileStatsDto[]): void {
		this._storage.set(data);
		this._storageError.set(null);
	}

	setStorageLoading(loading: boolean): void {
		this._storageLoading.set(loading);
	}

	setStorageError(error: string | null): void {
		this._storageError.set(error);
	}
	// #endregion

	// #region Comandos — table sizes
	setTableSizes(data: TableSizeDto[]): void {
		this._tableSizes.set(data);
		this._tableSizesError.set(null);
	}

	setTableSizesLoading(loading: boolean): void {
		this._tableSizesLoading.set(loading);
	}

	setTableSizesError(error: string | null): void {
		this._tableSizesError.set(error);
	}
	// #endregion
}
