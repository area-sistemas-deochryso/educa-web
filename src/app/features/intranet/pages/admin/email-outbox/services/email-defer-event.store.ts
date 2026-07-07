import { Injectable, computed, signal } from '@angular/core';

import { BaseReadStore } from '@core/store';
import { DeferEventTipo, EmailDeferEventDto, TrendPunto } from '@data/models';

/**
 * Brief 392 — store del tab Defer Events (timeline read-only).
 *
 * Extiende `BaseReadStore` (sin CRUD, sin formData) y agrega:
 *   - Paginación server-side + filtros (tipo/dominio/desde/hasta).
 *   - Catálogo dinámico de tipos (`tipoOptions`).
 *   - Tendencia 30d para el sparkline.
 */
@Injectable({ providedIn: 'root' })
export class EmailDeferEventStore extends BaseReadStore<EmailDeferEventDto> {
	// #region Estado privado adicional
	private readonly _page = signal(1);
	private readonly _pageSize = signal(25);
	private readonly _total = signal(0);

	private readonly _filterTipo = signal<DeferEventTipo | null>(null);
	private readonly _filterDominio = signal<string>('');
	private readonly _filterDesde = signal<Date | null>(null);
	private readonly _filterHasta = signal<Date | null>(null);

	private readonly _tipoOptions = signal<{ label: string; value: DeferEventTipo }[]>([]);
	private readonly _tipoOptionsLoading = signal(true);

	private readonly _trend = signal<readonly TrendPunto[]>([]);
	private readonly _trendLoading = signal(false);
	// #endregion

	// #region Lecturas públicas adicionales
	readonly page = this._page.asReadonly();
	readonly pageSize = this._pageSize.asReadonly();
	readonly total = this._total.asReadonly();

	readonly filterTipo = this._filterTipo.asReadonly();
	readonly filterDominio = this._filterDominio.asReadonly();
	readonly filterDesde = this._filterDesde.asReadonly();
	readonly filterHasta = this._filterHasta.asReadonly();

	readonly tipoOptions = this._tipoOptions.asReadonly();
	readonly tipoOptionsLoading = this._tipoOptionsLoading.asReadonly();

	readonly trend = this._trend.asReadonly();
	readonly trendLoading = this._trendLoading.asReadonly();

	readonly first = computed(() => (this._page() - 1) * this._pageSize());
	// #endregion

	// #region Paginación
	setPage(page: number): void {
		this._page.set(page);
	}
	setPagination(page: number, pageSize: number, total: number): void {
		this._page.set(page);
		this._pageSize.set(pageSize);
		this._total.set(total);
	}
	// #endregion

	// #region Filtros
	setFilterTipo(tipo: DeferEventTipo | null): void {
		this._filterTipo.set(tipo);
	}
	setFilterDominio(dominio: string): void {
		this._filterDominio.set(dominio);
	}
	setFilterDesde(desde: Date | null): void {
		this._filterDesde.set(desde);
	}
	setFilterHasta(hasta: Date | null): void {
		this._filterHasta.set(hasta);
	}
	clearFiltros(): void {
		this._filterTipo.set(null);
		this._filterDominio.set('');
		this._filterDesde.set(null);
		this._filterHasta.set(null);
		this._page.set(1);
	}
	// #endregion

	// #region Catálogo de tipos
	setTipoOptions(options: { label: string; value: DeferEventTipo }[]): void {
		this._tipoOptions.set(options);
		this._tipoOptionsLoading.set(false);
	}
	// #endregion

	// #region Trend
	setTrend(data: readonly TrendPunto[]): void {
		this._trend.set(data);
	}
	setTrendLoading(loading: boolean): void {
		this._trendLoading.set(loading);
	}
	// #endregion
}
