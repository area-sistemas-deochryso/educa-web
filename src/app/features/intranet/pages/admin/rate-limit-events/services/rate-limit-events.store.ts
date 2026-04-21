import { Injectable, computed, signal } from '@angular/core';

import {
	DEFAULT_TAKE,
	RateLimitEventFiltro,
	RateLimitEventListaDto,
	RateLimitStats,
} from '../models';

const DEFAULT_FILTER: RateLimitEventFiltro = {
	dni: undefined,
	rol: null,
	endpoint: undefined,
	policy: null,
	soloRechazados: false,
	desde: null,
	hasta: null,
	take: DEFAULT_TAKE,
};

@Injectable({ providedIn: 'root' })
export class RateLimitEventsStore {
	// #region Estado privado
	private readonly _items = signal<RateLimitEventListaDto[]>([]);
	private readonly _stats = signal<RateLimitStats | null>(null);
	private readonly _loading = signal(false);
	private readonly _loadingStats = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _tableReady = signal(false);
	private readonly _filter = signal<RateLimitEventFiltro>({ ...DEFAULT_FILTER });

	private readonly _drawerVisible = signal(false);
	private readonly _selectedItem = signal<RateLimitEventListaDto | null>(null);
	// #endregion

	// #region Lecturas públicas
	readonly items = this._items.asReadonly();
	readonly stats = this._stats.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly loadingStats = this._loadingStats.asReadonly();
	readonly error = this._error.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();
	readonly filter = this._filter.asReadonly();
	readonly drawerVisible = this._drawerVisible.asReadonly();
	readonly selectedItem = this._selectedItem.asReadonly();
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this._items(),
		stats: this._stats(),
		loading: this._loading(),
		loadingStats: this._loadingStats(),
		error: this._error(),
		tableReady: this._tableReady(),
		filter: this._filter(),
		drawerVisible: this._drawerVisible(),
		selectedItem: this._selectedItem(),
	}));
	// #endregion

	// #region Mutaciones — Data
	setItems(items: RateLimitEventListaDto[]): void {
		this._items.set(items);
	}

	setStats(stats: RateLimitStats | null): void {
		this._stats.set(stats);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setLoadingStats(loadingStats: boolean): void {
		this._loadingStats.set(loadingStats);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	setTableReady(ready: boolean): void {
		this._tableReady.set(ready);
	}
	// #endregion

	// #region Mutaciones — Filtro
	setFilter(partial: Partial<RateLimitEventFiltro>): void {
		this._filter.update((current) => ({ ...current, ...partial }));
	}

	resetFilter(): void {
		this._filter.set({ ...DEFAULT_FILTER });
	}
	// #endregion

	// #region Mutaciones — Drawer
	openDrawer(item: RateLimitEventListaDto): void {
		this._selectedItem.set(item);
		this._drawerVisible.set(true);
	}

	closeDrawer(): void {
		this._drawerVisible.set(false);
		this._selectedItem.set(null);
	}
	// #endregion
}
