// #region Imports
import { Injectable, computed, signal } from '@angular/core';

import type {
	ReporteUsuarioDetalleDto,
	ReporteUsuarioEstadisticasDto,
	ReporteUsuarioListaDto,
} from '@core/services/feedback';

// #endregion
// #region Implementation
/**
 * Store de la página admin de reportes de usuario.
 * Mantiene items, filtros, drawer de detalle y estadísticas.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackReportsStore {
	// #region Estado privado
	private readonly _items = signal<ReporteUsuarioListaDto[]>([]);
	private readonly _estadisticas = signal<ReporteUsuarioEstadisticasDto | null>(null);
	private readonly _loading = signal(false);
	private readonly _statsReady = signal(false);
	private readonly _tableReady = signal(false);

	// Filtros
	private readonly _filterTipo = signal<string | null>(null);
	private readonly _filterEstado = signal<string | null>(null);
	private readonly _filterDesde = signal<Date | null>(null);
	private readonly _filterHasta = signal<Date | null>(null);

	// Drawer
	private readonly _drawerVisible = signal(false);
	private readonly _selectedItem = signal<ReporteUsuarioListaDto | null>(null);
	private readonly _detalle = signal<ReporteUsuarioDetalleDto | null>(null);
	private readonly _detalleLoading = signal(false);
	private readonly _estadoUpdating = signal(false);
	// #endregion

	// #region Lecturas públicas
	readonly items = this._items.asReadonly();
	readonly estadisticas = this._estadisticas.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly statsReady = this._statsReady.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();
	readonly filterTipo = this._filterTipo.asReadonly();
	readonly filterEstado = this._filterEstado.asReadonly();
	readonly filterDesde = this._filterDesde.asReadonly();
	readonly filterHasta = this._filterHasta.asReadonly();
	readonly drawerVisible = this._drawerVisible.asReadonly();
	readonly selectedItem = this._selectedItem.asReadonly();
	readonly detalle = this._detalle.asReadonly();
	readonly detalleLoading = this._detalleLoading.asReadonly();
	readonly estadoUpdating = this._estadoUpdating.asReadonly();
	// #endregion

	// #region Computed
	readonly totalItems = computed(() => this._items().length);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this._items(),
		estadisticas: this._estadisticas(),
		loading: this._loading(),
		statsReady: this._statsReady(),
		tableReady: this._tableReady(),
		filterTipo: this._filterTipo(),
		filterEstado: this._filterEstado(),
		filterDesde: this._filterDesde(),
		filterHasta: this._filterHasta(),
		drawerVisible: this._drawerVisible(),
		selectedItem: this._selectedItem(),
		detalle: this._detalle(),
		detalleLoading: this._detalleLoading(),
		estadoUpdating: this._estadoUpdating(),
		totalItems: this.totalItems(),
	}));
	// #endregion

	// #region Comandos — Data
	setItems(items: ReporteUsuarioListaDto[]): void {
		this._items.set(items);
	}
	setEstadisticas(stats: ReporteUsuarioEstadisticasDto): void {
		this._estadisticas.set(stats);
	}
	setLoading(v: boolean): void {
		this._loading.set(v);
	}
	setStatsReady(v: boolean): void {
		this._statsReady.set(v);
	}
	setTableReady(v: boolean): void {
		this._tableReady.set(v);
	}
	// #endregion

	// #region Comandos — Filtros
	setFilterTipo(v: string | null): void {
		this._filterTipo.set(v);
	}
	setFilterEstado(v: string | null): void {
		this._filterEstado.set(v);
	}
	setFilterDesde(v: Date | null): void {
		this._filterDesde.set(v);
	}
	setFilterHasta(v: Date | null): void {
		this._filterHasta.set(v);
	}
	clearFilters(): void {
		this._filterTipo.set(null);
		this._filterEstado.set(null);
		this._filterDesde.set(null);
		this._filterHasta.set(null);
	}
	// #endregion

	// #region Comandos — Drawer
	openDrawer(item: ReporteUsuarioListaDto): void {
		this._selectedItem.set(item);
		this._drawerVisible.set(true);
		this._detalle.set(null);
	}

	closeDrawer(): void {
		this._drawerVisible.set(false);
		this._selectedItem.set(null);
		this._detalle.set(null);
	}

	setDetalle(detalle: ReporteUsuarioDetalleDto): void {
		this._detalle.set(detalle);
	}
	setDetalleLoading(v: boolean): void {
		this._detalleLoading.set(v);
	}
	setEstadoUpdating(v: boolean): void {
		this._estadoUpdating.set(v);
	}

	/** Mutación quirúrgica: actualiza estado de un ítem sin refetch completo. */
	updateItemEstado(id: number, estado: ReporteUsuarioListaDto['estado']): void {
		this._items.update((list) =>
			list.map((i) => (i.id === id ? { ...i, estado } : i)),
		);
	}
	// #endregion
}
// #endregion
