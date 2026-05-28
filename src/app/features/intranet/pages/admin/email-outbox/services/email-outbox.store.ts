import { computed, Injectable, signal } from '@angular/core';

import {
	EmailOutboxEstadisticas,
	EmailOutboxEstado,
	EmailOutboxLista,
	EmailOutboxTendencia,
	EmailOutboxTipo,
} from '@data/models';
import { DeferFailStatus } from '../models/defer-fail-status.models';
import { EmailOutboxExportDto } from '../models/email-outbox-export.models';
import { ThrottleStatus } from '../models/throttle-status.models';

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
	private readonly _error = signal<string | null>(null);
	private readonly _statsReady = signal(false);
	private readonly _tableReady = signal(false);

	// Plan 43 Chat 4.1b — paginación server-side (variante B per rules/pagination.md)
	private readonly _page = signal(1);
	private readonly _pageSize = signal(25);
	private readonly _totalCount = signal<number | null>(null);

	// Filtros
	private readonly _searchTerm = signal('');
	private readonly _filterTipo = signal<EmailOutboxTipo | null>(null);
	private readonly _filterEstado = signal<EmailOutboxEstado | null>(null);
	private readonly _filterTipoFallo = signal<string | null>(null);
	private readonly _filterDesde = signal<string | null>(null);
	private readonly _filterHasta = signal<string | null>(null);
	private readonly _filterCorrelationId = signal<string | null>(null);

	// UI
	private readonly _drawerVisible = signal(false);
	private readonly _selectedItem = signal<EmailOutboxLista | null>(null);
	private readonly _previewHtml = signal<string | null>(null);
	private readonly _previewLoading = signal(false);

	// Tendencias
	private readonly _tendencias = signal<EmailOutboxTendencia[]>([]);
	private readonly _tendenciasReady = signal(false);

	// Plan 22 Chat B — throttle status widget (per-sender + dominio + polling opcional)
	private readonly _throttleStatus = signal<ThrottleStatus | null>(null);
	private readonly _throttleLoading = signal(false);
	private readonly _throttleAutoRefresh = signal(false);
	private readonly _throttleCollapsed = signal(false);

	// Plan 22 Chat B / Plan 29 Chat 2.6 — defer/fail status widget (techo cPanel + 24h + blacklist)
	private readonly _deferFailStatus = signal<DeferFailStatus | null>(null);
	private readonly _deferFailLoading = signal(false);
	private readonly _deferFailAutoRefresh = signal(false);
	private readonly _deferFailCollapsed = signal(false);

	// Export caso drawer
	private readonly _exportDrawerVisible = signal(false);
	private readonly _exportData = signal<EmailOutboxExportDto | null>(null);
	private readonly _exportLoading = signal(false);
	// #endregion

	// #region Lecturas públicas
	readonly items = this._items.asReadonly();
	readonly estadisticas = this._estadisticas.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly statsReady = this._statsReady.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();
	readonly page = this._page.asReadonly();
	readonly pageSize = this._pageSize.asReadonly();
	readonly totalCount = this._totalCount.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();
	readonly filterTipo = this._filterTipo.asReadonly();
	readonly filterEstado = this._filterEstado.asReadonly();
	readonly filterTipoFallo = this._filterTipoFallo.asReadonly();
	readonly filterDesde = this._filterDesde.asReadonly();
	readonly filterHasta = this._filterHasta.asReadonly();
	readonly filterCorrelationId = this._filterCorrelationId.asReadonly();
	readonly drawerVisible = this._drawerVisible.asReadonly();
	readonly selectedItem = this._selectedItem.asReadonly();
	readonly previewHtml = this._previewHtml.asReadonly();
	readonly previewLoading = this._previewLoading.asReadonly();
	readonly tendencias = this._tendencias.asReadonly();
	readonly tendenciasReady = this._tendenciasReady.asReadonly();
	readonly throttleStatus = this._throttleStatus.asReadonly();
	readonly throttleLoading = this._throttleLoading.asReadonly();
	readonly throttleAutoRefresh = this._throttleAutoRefresh.asReadonly();
	readonly throttleCollapsed = this._throttleCollapsed.asReadonly();
	readonly deferFailStatus = this._deferFailStatus.asReadonly();
	readonly deferFailLoading = this._deferFailLoading.asReadonly();
	readonly deferFailAutoRefresh = this._deferFailAutoRefresh.asReadonly();
	readonly deferFailCollapsed = this._deferFailCollapsed.asReadonly();
	readonly exportDrawerVisible = this._exportDrawerVisible.asReadonly();
	readonly exportData = this._exportData.asReadonly();
	readonly exportLoading = this._exportLoading.asReadonly();
	// #endregion

	// #region Computed
	/**
	 * Plan 43 Chat 4.1b — los filtros ahora van al BE (paginación server-side
	 * variante B). El store solo expone el array tal cual lo devuelve el server.
	 */
	readonly filteredItems = computed(() => this._items());

	/**
	 * Total real cuando `/count` respondió; cae al estimate progresivo si
	 * count=null por fallo (per `rules/pagination.md` §"Fail-safe del count").
	 */
	readonly totalRecordsEstimate = computed(() => {
		const total = this._totalCount();
		if (total !== null) return total;
		const page = this._page();
		const pageSize = this._pageSize();
		const items = this._items();
		const offset = (page - 1) * pageSize;
		return items.length < pageSize ? offset + items.length : offset + pageSize + 1;
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this.filteredItems(),
		estadisticas: this._estadisticas(),
		loading: this._loading(),
		error: this._error(),
		statsReady: this._statsReady(),
		tableReady: this._tableReady(),
		page: this._page(),
		pageSize: this._pageSize(),
		totalCount: this._totalCount(),
		totalRecordsEstimate: this.totalRecordsEstimate(),
		searchTerm: this._searchTerm(),
		filterTipo: this._filterTipo(),
		filterEstado: this._filterEstado(),
		filterTipoFallo: this._filterTipoFallo(),
		filterDesde: this._filterDesde(),
		filterHasta: this._filterHasta(),
		filterCorrelationId: this._filterCorrelationId(),
		drawerVisible: this._drawerVisible(),
		selectedItem: this._selectedItem(),
		previewHtml: this._previewHtml(),
		previewLoading: this._previewLoading(),
		tendencias: this._tendencias(),
		tendenciasReady: this._tendenciasReady(),
		throttleStatus: this._throttleStatus(),
		throttleLoading: this._throttleLoading(),
		throttleAutoRefresh: this._throttleAutoRefresh(),
		throttleCollapsed: this._throttleCollapsed(),
		deferFailStatus: this._deferFailStatus(),
		deferFailLoading: this._deferFailLoading(),
		deferFailAutoRefresh: this._deferFailAutoRefresh(),
		deferFailCollapsed: this._deferFailCollapsed(),
		exportDrawerVisible: this._exportDrawerVisible(),
		exportData: this._exportData(),
		exportLoading: this._exportLoading(),
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

	setError(error: string | null): void {
		this._error.set(error);
	}

	setStatsReady(ready: boolean): void {
		this._statsReady.set(ready);
	}

	setTableReady(ready: boolean): void {
		this._tableReady.set(ready);
	}

	setTendencias(tendencias: EmailOutboxTendencia[]): void {
		this._tendencias.set(tendencias);
	}

	setTendenciasReady(ready: boolean): void {
		this._tendenciasReady.set(ready);
	}

	// Plan 43 Chat 4.1b — paginación
	setPage(page: number): void {
		this._page.set(page);
	}

	setPageSize(pageSize: number): void {
		this._pageSize.set(pageSize);
	}

	setPaginationState(page: number, pageSize: number): void {
		this._page.set(page);
		this._pageSize.set(pageSize);
	}

	setTotalCount(count: number | null): void {
		this._totalCount.set(count);
	}

	/**
	 * Mutación quirúrgica: elimina un item de la lista y decrementa el total
	 * para mantener coherencia con el paginador (per `rules/pagination.md`).
	 */
	removeItem(id: number): void {
		this._items.update((list) => list.filter((i) => i.id !== id));
		this._totalCount.update((c) => (c !== null && c > 0 ? c - 1 : c));
	}

	/** Mutación quirúrgica: marca item como PENDING tras reintento */
	markAsRetrying(id: number): void {
		this._items.update((list) =>
			list.map((i) => (i.id === id ? { ...i, estado: 'PENDING' as const, intentos: 0 } : i)),
		);
	}

	// * Plan 22 Chat B — throttle status
	setThrottleStatus(status: ThrottleStatus | null): void {
		this._throttleStatus.set(status);
	}

	setThrottleLoading(loading: boolean): void {
		this._throttleLoading.set(loading);
	}

	setThrottleAutoRefresh(enabled: boolean): void {
		this._throttleAutoRefresh.set(enabled);
	}

	setThrottleCollapsed(collapsed: boolean): void {
		this._throttleCollapsed.set(collapsed);
	}

	// * Plan 22 Chat B / Plan 29 Chat 2.6 — defer/fail status
	setDeferFailStatus(status: DeferFailStatus | null): void {
		this._deferFailStatus.set(status);
	}

	setDeferFailLoading(loading: boolean): void {
		this._deferFailLoading.set(loading);
	}

	setDeferFailAutoRefresh(enabled: boolean): void {
		this._deferFailAutoRefresh.set(enabled);
	}

	setDeferFailCollapsed(collapsed: boolean): void {
		this._deferFailCollapsed.set(collapsed);
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

	setFilterTipoFallo(tipoFallo: string | null): void {
		this._filterTipoFallo.set(tipoFallo);
	}

	setFilterDesde(desde: string | null): void {
		this._filterDesde.set(desde);
	}

	setFilterHasta(hasta: string | null): void {
		this._filterHasta.set(hasta);
	}

	setFilterCorrelationId(correlationId: string | null): void {
		this._filterCorrelationId.set(correlationId);
	}

	/**
	 * Plan 43 Chat 4.1b — resetea todos los filtros + page=1. El facade ejecuta
	 * el refetch tras llamar a este método.
	 */
	clearFilters(): void {
		this._searchTerm.set('');
		this._filterTipo.set(null);
		this._filterEstado.set(null);
		this._filterTipoFallo.set(null);
		this._filterDesde.set(null);
		this._filterHasta.set(null);
		this._filterCorrelationId.set(null);
		this._page.set(1);
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

	setExportDrawerVisible(visible: boolean): void {
		this._exportDrawerVisible.set(visible);
	}

	setExportData(data: EmailOutboxExportDto | null): void {
		this._exportData.set(data);
	}

	setExportLoading(loading: boolean): void {
		this._exportLoading.set(loading);
	}
	// #endregion
}
