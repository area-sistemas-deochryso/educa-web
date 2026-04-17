import { Injectable, computed, signal } from '@angular/core';

import { ErrorLogLista, ErrorOrigen, ErrorSeveridad } from '../models';

@Injectable({ providedIn: 'root' })
export class ErrorLogsStore {
	// #region Estado privado
	private readonly _items = signal<ErrorLogLista[]>([]);
	private readonly _loading = signal(false);
	private readonly _tableReady = signal(false);

	// Filtros
	private readonly _filterOrigen = signal<ErrorOrigen | null>(null);
	private readonly _filterSeveridad = signal<ErrorSeveridad | null>(null);
	private readonly _filterHttp = signal<string | null>(null);
	private readonly _filterUsuarioRol = signal<string | null>(null);
	private readonly _page = signal(1);
	private readonly _pageSize = signal(15);

	// Drawer (la carga del detalle la maneja el componente drawer standalone)
	private readonly _drawerVisible = signal(false);
	private readonly _selectedItem = signal<ErrorLogLista | null>(null);
	// #endregion

	// #region Lecturas públicas
	readonly items = this._items.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();
	readonly filterOrigen = this._filterOrigen.asReadonly();
	readonly filterSeveridad = this._filterSeveridad.asReadonly();
	readonly filterHttp = this._filterHttp.asReadonly();
	readonly filterUsuarioRol = this._filterUsuarioRol.asReadonly();
	readonly page = this._page.asReadonly();
	readonly pageSize = this._pageSize.asReadonly();
	readonly drawerVisible = this._drawerVisible.asReadonly();
	readonly selectedItem = this._selectedItem.asReadonly();
	// #endregion

	// #region Computed
	readonly totalItems = computed(() => this._items().length);

	readonly stats = computed(() => {
		const items = this._items();
		return {
			total: items.length,
			critical: items.filter((i) => i.severidad === 'CRITICAL').length,
			error: items.filter((i) => i.severidad === 'ERROR').length,
			warning: items.filter((i) => i.severidad === 'WARNING').length,
			frontend: items.filter((i) => i.origen === 'FRONTEND').length,
			backend: items.filter((i) => i.origen === 'BACKEND').length,
			network: items.filter((i) => i.origen === 'NETWORK').length,
		};
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this._items(),
		loading: this._loading(),
		tableReady: this._tableReady(),
		filterOrigen: this._filterOrigen(),
		filterSeveridad: this._filterSeveridad(),
		filterHttp: this._filterHttp(),
		filterUsuarioRol: this._filterUsuarioRol(),
		page: this._page(),
		pageSize: this._pageSize(),
		drawerVisible: this._drawerVisible(),
		selectedItem: this._selectedItem(),
		stats: this.stats(),
	}));
	// #endregion

	// #region Comandos — Data
	setItems(items: ErrorLogLista[]): void {
		this._items.set(items);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setTableReady(ready: boolean): void {
		this._tableReady.set(ready);
	}

	/** Mutación quirúrgica: elimina un item del listado sin refetch. */
	removeItem(id: number): void {
		this._items.update((list) => list.filter((i) => i.id !== id));
	}
	// #endregion

	// #region Comandos — Filtros
	setFilterOrigen(origen: ErrorOrigen | null): void {
		this._filterOrigen.set(origen);
	}

	setFilterSeveridad(severidad: ErrorSeveridad | null): void {
		this._filterSeveridad.set(severidad);
	}

	setFilterHttp(http: string | null): void {
		this._filterHttp.set(http);
	}

	setFilterUsuarioRol(rol: string | null): void {
		this._filterUsuarioRol.set(rol);
	}

	setPage(page: number): void {
		this._page.set(page);
	}

	setPageSize(pageSize: number): void {
		this._pageSize.set(pageSize);
	}
	// #endregion

	// #region Comandos — Drawer
	openDrawer(item: ErrorLogLista): void {
		this._selectedItem.set(item);
		this._drawerVisible.set(true);
	}

	closeDrawer(): void {
		this._drawerVisible.set(false);
		this._selectedItem.set(null);
	}
	// #endregion
}
