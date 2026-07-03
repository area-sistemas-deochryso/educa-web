import { Injectable, computed, signal } from '@angular/core';

import {
	ActiveBlockingSessionDto,
	DatabaseFileStatsDto,
	IdentityValueDto,
	IndexFragmentationDto,
	MissingIndexDto,
	ResourceStatsSnapshotDto,
	TableSizeDto,
	TopQueryDto,
	UnusedIndexDto,
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

	// #region Estado privado — missing indexes
	private readonly _missingIndexes = signal<MissingIndexDto[]>([]);
	private readonly _missingIndexesLoading = signal(false);
	private readonly _missingIndexesError = signal<string | null>(null);
	// #endregion

	// #region Estado privado — index fragmentation
	private readonly _indexFragmentation = signal<IndexFragmentationDto[]>([]);
	private readonly _indexFragmentationLoading = signal(false);
	private readonly _indexFragmentationError = signal<string | null>(null);
	// #endregion

	// #region Estado privado — unused indexes
	private readonly _unusedIndexes = signal<UnusedIndexDto[]>([]);
	private readonly _unusedIndexesLoading = signal(false);
	private readonly _unusedIndexesError = signal<string | null>(null);
	// #endregion

	// #region Estado privado — identity values
	private readonly _identityValues = signal<IdentityValueDto[]>([]);
	private readonly _identityValuesLoading = signal(false);
	private readonly _identityValuesError = signal<string | null>(null);
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

	// #region Lecturas públicas — missing indexes
	readonly missingIndexesVm = computed(() => ({
		data: this._missingIndexes(),
		loading: this._missingIndexesLoading(),
		error: this._missingIndexesError(),
	}));
	// #endregion

	// #region Lecturas públicas — index fragmentation
	readonly indexFragmentationVm = computed(() => ({
		data: this._indexFragmentation(),
		loading: this._indexFragmentationLoading(),
		error: this._indexFragmentationError(),
	}));
	// #endregion

	// #region Lecturas públicas — unused indexes
	readonly unusedIndexesVm = computed(() => ({
		data: this._unusedIndexes(),
		loading: this._unusedIndexesLoading(),
		error: this._unusedIndexesError(),
	}));
	// #endregion

	// #region Lecturas públicas — identity values
	readonly identityValuesVm = computed(() => ({
		data: this._identityValues(),
		loading: this._identityValuesLoading(),
		error: this._identityValuesError(),
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

	// #region Comandos — missing indexes
	setMissingIndexes(data: MissingIndexDto[]): void {
		this._missingIndexes.set(data);
		this._missingIndexesError.set(null);
	}

	setMissingIndexesLoading(loading: boolean): void {
		this._missingIndexesLoading.set(loading);
	}

	setMissingIndexesError(error: string | null): void {
		this._missingIndexesError.set(error);
	}
	// #endregion

	// #region Comandos — index fragmentation
	setIndexFragmentation(data: IndexFragmentationDto[]): void {
		this._indexFragmentation.set(data);
		this._indexFragmentationError.set(null);
	}

	setIndexFragmentationLoading(loading: boolean): void {
		this._indexFragmentationLoading.set(loading);
	}

	setIndexFragmentationError(error: string | null): void {
		this._indexFragmentationError.set(error);
	}
	// #endregion

	// #region Comandos — unused indexes
	setUnusedIndexes(data: UnusedIndexDto[]): void {
		this._unusedIndexes.set(data);
		this._unusedIndexesError.set(null);
	}

	setUnusedIndexesLoading(loading: boolean): void {
		this._unusedIndexesLoading.set(loading);
	}

	setUnusedIndexesError(error: string | null): void {
		this._unusedIndexesError.set(error);
	}
	// #endregion

	// #region Comandos — identity values
	setIdentityValues(data: IdentityValueDto[]): void {
		this._identityValues.set(data);
		this._identityValuesError.set(null);
	}

	setIdentityValuesLoading(loading: boolean): void {
		this._identityValuesLoading.set(loading);
	}

	setIdentityValuesError(error: string | null): void {
		this._identityValuesError.set(error);
	}
	// #endregion
}
