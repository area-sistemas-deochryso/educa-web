import { computed, Injectable, signal } from '@angular/core';

import {
	EmailOutboxEstadisticas,
	EmailOutboxEstado,
	EmailOutboxLista,
	EmailOutboxTipo,
} from '@data/models/email-outbox.models';

@Injectable({ providedIn: 'root' })
export class EmailOutboxStore {
	// #region Estado privado
	private readonly _items = signal<EmailOutboxLista[]>([]);
	private readonly _estadisticas = signal<EmailOutboxEstadisticas>({
		total: 0,
		enviados: 0,
		fallidos: 0,
		pendientes: 0,
		enProceso: 0,
		porcentajeExito: 0,
	});
	private readonly _loading = signal(false);
	private readonly _statsReady = signal(false);
	private readonly _tableReady = signal(false);

	// Filtros
	private readonly _searchTerm = signal('');
	private readonly _filterTipo = signal<EmailOutboxTipo | null>(null);
	private readonly _filterEstado = signal<EmailOutboxEstado | null>(null);
	private readonly _filterDesde = signal<string | null>(null);
	private readonly _filterHasta = signal<string | null>(null);

	// UI
	private readonly _drawerVisible = signal(false);
	private readonly _selectedItem = signal<EmailOutboxLista | null>(null);
	private readonly _previewHtml = signal<string | null>(null);
	private readonly _previewLoading = signal(false);
	// #endregion

	// #region Lecturas públicas
	readonly items = this._items.asReadonly();
	readonly estadisticas = this._estadisticas.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly statsReady = this._statsReady.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();
	readonly filterTipo = this._filterTipo.asReadonly();
	readonly filterEstado = this._filterEstado.asReadonly();
	readonly filterDesde = this._filterDesde.asReadonly();
	readonly filterHasta = this._filterHasta.asReadonly();
	readonly drawerVisible = this._drawerVisible.asReadonly();
	readonly selectedItem = this._selectedItem.asReadonly();
	readonly previewHtml = this._previewHtml.asReadonly();
	readonly previewLoading = this._previewLoading.asReadonly();
	// #endregion

	// #region Computed
	readonly filteredItems = computed(() => {
		const items = this._items();
		const search = this._searchTerm().toLowerCase();
		if (!search) return items;
		return items.filter(
			(i) =>
				i.destinatario.toLowerCase().includes(search) ||
				i.asunto.toLowerCase().includes(search),
		);
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this.filteredItems(),
		estadisticas: this._estadisticas(),
		loading: this._loading(),
		statsReady: this._statsReady(),
		tableReady: this._tableReady(),
		searchTerm: this._searchTerm(),
		filterTipo: this._filterTipo(),
		filterEstado: this._filterEstado(),
		filterDesde: this._filterDesde(),
		filterHasta: this._filterHasta(),
		drawerVisible: this._drawerVisible(),
		selectedItem: this._selectedItem(),
		previewHtml: this._previewHtml(),
		previewLoading: this._previewLoading(),
	}));
	// #endregion

	// #region Comandos de mutación
	setItems(items: EmailOutboxLista[]): void {
		this._items.set(items);
	}

	setEstadisticas(stats: EmailOutboxEstadisticas): void {
		this._estadisticas.set(stats);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setStatsReady(ready: boolean): void {
		this._statsReady.set(ready);
	}

	setTableReady(ready: boolean): void {
		this._tableReady.set(ready);
	}

	/** Mutación quirúrgica: marca item como PENDING tras reintento */
	markAsRetrying(id: number): void {
		this._items.update((list) =>
			list.map((i) => (i.id === id ? { ...i, estado: 'PENDING' as const, intentos: 0 } : i)),
		);
	}
	// #endregion

	// #region Comandos de filtro
	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
	}

	setFilterTipo(tipo: EmailOutboxTipo | null): void {
		this._filterTipo.set(tipo);
	}

	setFilterEstado(estado: EmailOutboxEstado | null): void {
		this._filterEstado.set(estado);
	}

	setFilterDesde(desde: string | null): void {
		this._filterDesde.set(desde);
	}

	setFilterHasta(hasta: string | null): void {
		this._filterHasta.set(hasta);
	}
	// #endregion

	// #region Comandos de UI
	openDrawer(item: EmailOutboxLista): void {
		this._selectedItem.set(item);
		this._drawerVisible.set(true);
		this._previewHtml.set(null);
	}

	closeDrawer(): void {
		this._drawerVisible.set(false);
		this._selectedItem.set(null);
		this._previewHtml.set(null);
	}

	setPreviewHtml(html: string | null): void {
		this._previewHtml.set(html);
	}

	setPreviewLoading(loading: boolean): void {
		this._previewLoading.set(loading);
	}
	// #endregion
}
