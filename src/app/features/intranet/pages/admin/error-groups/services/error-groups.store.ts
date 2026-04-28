import { Injectable, computed, signal } from '@angular/core';

import {
	ErrorGroupDetalle,
	ErrorGroupEstado,
	ErrorGroupLista,
	ErrorOrigen,
	ErrorSeveridad,
	OcurrenciaLista,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ErrorGroupsStore {
	// #region Estado privado — listado
	private readonly _items = signal<ErrorGroupLista[]>([]);
	private readonly _loading = signal(false);
	private readonly _tableReady = signal(false);
	private readonly _totalCount = signal<number | null>(null);
	private readonly _page = signal(1);
	private readonly _pageSize = signal(20);
	// #endregion

	// #region Estado privado — filtros
	private readonly _filterEstado = signal<ErrorGroupEstado | null>(null);
	private readonly _filterSeveridad = signal<ErrorSeveridad | null>(null);
	private readonly _filterOrigen = signal<ErrorOrigen | null>(null);
	private readonly _searchTerm = signal<string>('');
	/**
	 * Toggle "Ocultar resueltos/ignorados" — OFF por defecto. Cuando ON sin filtro
	 * de estado explícito se aplica filtro client-side post-fetch (la deuda
	 * documentada en el plan: el BE acepta solo 1 estado).
	 */
	private readonly _hideResolvedIgnored = signal(false);
	// #endregion

	// #region Estado privado — drawer + dialog + ocurrencias
	private readonly _drawerVisible = signal(false);
	private readonly _selectedGroup = signal<ErrorGroupLista | null>(null);
	private readonly _selectedDetalle = signal<ErrorGroupDetalle | null>(null);
	private readonly _detalleLoading = signal(false);

	private readonly _ocurrencias = signal<OcurrenciaLista[]>([]);
	private readonly _ocurrenciasLoading = signal(false);
	private readonly _ocurrenciasPage = signal(1);
	private readonly _ocurrenciasPageSize = signal(20);

	private readonly _occurrenceDrawerVisible = signal(false);
	private readonly _selectedOcurrenciaId = signal<number | null>(null);

	private readonly _dialogVisible = signal(false);
	private readonly _dialogGroup = signal<ErrorGroupLista | null>(null);
	// #endregion

	// #region Lecturas públicas — listado
	readonly items = this._items.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();
	readonly totalCount = this._totalCount.asReadonly();
	readonly page = this._page.asReadonly();
	readonly pageSize = this._pageSize.asReadonly();
	// #endregion

	// #region Lecturas públicas — filtros
	readonly filterEstado = this._filterEstado.asReadonly();
	readonly filterSeveridad = this._filterSeveridad.asReadonly();
	readonly filterOrigen = this._filterOrigen.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();
	readonly hideResolvedIgnored = this._hideResolvedIgnored.asReadonly();
	// #endregion

	// #region Lecturas públicas — drawer + dialog + ocurrencias
	readonly drawerVisible = this._drawerVisible.asReadonly();
	readonly selectedGroup = this._selectedGroup.asReadonly();
	readonly selectedDetalle = this._selectedDetalle.asReadonly();
	readonly detalleLoading = this._detalleLoading.asReadonly();

	readonly ocurrencias = this._ocurrencias.asReadonly();
	readonly ocurrenciasLoading = this._ocurrenciasLoading.asReadonly();
	readonly ocurrenciasPage = this._ocurrenciasPage.asReadonly();
	readonly ocurrenciasPageSize = this._ocurrenciasPageSize.asReadonly();

	readonly occurrenceDrawerVisible = this._occurrenceDrawerVisible.asReadonly();
	readonly selectedOcurrenciaId = this._selectedOcurrenciaId.asReadonly();

	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly dialogGroup = this._dialogGroup.asReadonly();
	// #endregion

	// #region Computed
	/**
	 * Aplica filtro client-side cuando el toggle "ocultar resueltos/ignorados"
	 * está ON y no hay filtro de estado explícito (deuda documentada en plan:
	 * el BE acepta solo 1 estado). Si hay filtro estado explícito, el toggle
	 * cede a esa selección.
	 */
	readonly visibleItems = computed(() => {
		const all = this._items();
		const hide = this._hideResolvedIgnored();
		const estado = this._filterEstado();
		if (estado) return all;
		if (!hide) return all;
		return all.filter((g) => g.estado !== 'RESUELTO' && g.estado !== 'IGNORADO');
	});

	readonly stats = computed(() => {
		const items = this._items();
		return {
			total: items.length,
			critical: items.filter((i) => i.severidad === 'CRITICAL').length,
			error: items.filter((i) => i.severidad === 'ERROR').length,
			warning: items.filter((i) => i.severidad === 'WARNING').length,
		};
	});
	// #endregion

	// #region Comandos — Listado
	setGroups(groups: ErrorGroupLista[]): void {
		this._items.set(groups);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setTableReady(ready: boolean): void {
		this._tableReady.set(ready);
	}

	setTotalCount(count: number | null): void {
		this._totalCount.set(count);
	}

	setPage(page: number): void {
		this._page.set(page);
	}

	setPageSize(pageSize: number): void {
		this._pageSize.set(pageSize);
	}

	/**
	 * Mutación quirúrgica: cambia el estado (y opcionalmente la observación
	 * y rowVersion) de un grupo sin tocar el resto del item ni refetchear.
	 */
	updateGroupEstado(
		id: number,
		estado: ErrorGroupEstado,
		patch?: Partial<Pick<ErrorGroupLista, 'rowVersion'>>,
	): void {
		this._items.update((list) =>
			list.map((g) => (g.id === id ? { ...g, estado, ...(patch ?? {}) } : g)),
		);
		// Si el grupo en drawer/dialog es el mismo, también actualizarlo.
		this._selectedGroup.update((g) =>
			g && g.id === id ? { ...g, estado, ...(patch ?? {}) } : g,
		);
		this._dialogGroup.update((g) =>
			g && g.id === id ? { ...g, estado, ...(patch ?? {}) } : g,
		);
	}

	replaceGroup(group: ErrorGroupLista): void {
		this._items.update((list) => list.map((g) => (g.id === group.id ? group : g)));
		this._selectedGroup.update((g) => (g && g.id === group.id ? group : g));
	}

	removeGroup(id: number): void {
		this._items.update((list) => list.filter((g) => g.id !== id));
		this._totalCount.update((c) => (c !== null && c > 0 ? c - 1 : c));
	}
	// #endregion

	// #region Comandos — Filtros
	setFilterEstado(estado: ErrorGroupEstado | null): void {
		this._filterEstado.set(estado);
	}

	setFilterSeveridad(severidad: ErrorSeveridad | null): void {
		this._filterSeveridad.set(severidad);
	}

	setFilterOrigen(origen: ErrorOrigen | null): void {
		this._filterOrigen.set(origen);
	}

	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
	}

	setHideResolvedIgnored(hide: boolean): void {
		this._hideResolvedIgnored.set(hide);
	}

	clearFilters(): void {
		this._filterEstado.set(null);
		this._filterSeveridad.set(null);
		this._filterOrigen.set(null);
		this._searchTerm.set('');
		this._hideResolvedIgnored.set(false);
	}
	// #endregion

	// #region Comandos — Drawer
	openDrawer(group: ErrorGroupLista): void {
		this._selectedGroup.set(group);
		this._drawerVisible.set(true);
	}

	closeDrawer(): void {
		this._drawerVisible.set(false);
		this._selectedGroup.set(null);
		this._selectedDetalle.set(null);
		this._ocurrencias.set([]);
		this._ocurrenciasPage.set(1);
	}

	clearSelectedGroup(): void {
		this._selectedGroup.set(null);
	}

	setSelectedDetalle(detalle: ErrorGroupDetalle | null): void {
		this._selectedDetalle.set(detalle);
	}

	setDetalleLoading(loading: boolean): void {
		this._detalleLoading.set(loading);
	}
	// #endregion

	// #region Comandos — Ocurrencias
	setOcurrencias(items: OcurrenciaLista[]): void {
		this._ocurrencias.set(items);
	}

	setOcurrenciasLoading(loading: boolean): void {
		this._ocurrenciasLoading.set(loading);
	}

	setOcurrenciasPage(page: number): void {
		this._ocurrenciasPage.set(page);
	}

	setOcurrenciasPageSize(pageSize: number): void {
		this._ocurrenciasPageSize.set(pageSize);
	}
	// #endregion

	// #region Comandos — Sub-drawer ocurrencia
	openOccurrenceDrawer(ocurrenciaId: number): void {
		this._selectedOcurrenciaId.set(ocurrenciaId);
		this._occurrenceDrawerVisible.set(true);
	}

	closeOccurrenceDrawer(): void {
		this._occurrenceDrawerVisible.set(false);
		this._selectedOcurrenciaId.set(null);
	}
	// #endregion

	// #region Comandos — Dialog cambio estado
	openDialog(group: ErrorGroupLista): void {
		this._dialogGroup.set(group);
		this._dialogVisible.set(true);
	}

	closeDialog(): void {
		this._dialogVisible.set(false);
		this._dialogGroup.set(null);
	}
	// #endregion
}
