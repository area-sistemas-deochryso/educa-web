import { Injectable, computed, signal } from '@angular/core';

import { BaseCrudStore } from '@core/store';
import {
	BlacklistEstadisticas,
	BlacklistFormData,
	EmailBlacklistEntry,
	EmailBlacklistFiltroEstado,
	EmailBlacklistMotivo,
} from '@data/models';

/**
 * Plan 38 Chat 5 — store del tab Blacklist.
 *
 * Extiende `BaseCrudStore` para reusar:
 *   - `items` / `loading` / `error` / `formData` / paginación / `dialogVisible`.
 *   - Mutaciones quirúrgicas `addItem` / `updateItem` / `removeItem`.
 *
 * Agrega:
 *   - Filtros específicos `estado` (`activa`/`inactiva`) y `motivo`.
 *   - Drawer de detalle separado del dialog (B10 vs B8 de `design-system.md`).
 *   - `tableReady` para skeleton vs tabla (rules/skeletons.md).
 *   - Estadísticas locales (universo `total/activas/inactivas` no derivado del listado paginado:
 *     se setean explícitamente cuando la facade conoce el total real desde el wrapper).
 */
@Injectable({ providedIn: 'root' })
export class BlacklistStore extends BaseCrudStore<
	EmailBlacklistEntry,
	BlacklistFormData,
	BlacklistEstadisticas
> {
	// #region Estado privado adicional
	private readonly _filterMotivo = signal<EmailBlacklistMotivo | null>(null);
	private readonly _filterEstadoBlacklist = signal<EmailBlacklistFiltroEstado | null>(null);
	private readonly _drawerVisible = signal(false);
	private readonly _drawerItem = signal<EmailBlacklistEntry | null>(null);
	private readonly _tableReady = signal(false);
	private readonly _trend = signal<readonly number[]>([]);
	private readonly _trendLoading = signal(false);
	// #endregion

	// #region Lecturas públicas adicionales
	readonly filterMotivo = this._filterMotivo.asReadonly();
	readonly filterEstadoBlacklist = this._filterEstadoBlacklist.asReadonly();
	readonly drawerVisible = this._drawerVisible.asReadonly();
	readonly drawerItem = this._drawerItem.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();
	readonly trend = this._trend.asReadonly();
	readonly trendLoading = this._trendLoading.asReadonly();

	/**
	 * Indica si hay filtros activos (search, estado, motivo) — usado por la
	 * tabla para diferenciar el empty state ("no hay resultados con esos filtros"
	 * vs "no hay blacklist registrada").
	 */
	readonly hasActiveFilters = computed(() =>
		!!this.searchTerm() || !!this._filterEstadoBlacklist() || !!this._filterMotivo(),
	);
	// #endregion

	constructor() {
		super({ correo: '', motivo: null, observacion: '' });
	}

	protected override getDefaultFormData(): BlacklistFormData {
		return { correo: '', motivo: null, observacion: '' };
	}

	// #region Filtros específicos
	setFilterMotivo(motivo: EmailBlacklistMotivo | null): void {
		this._filterMotivo.set(motivo);
	}

	setFilterEstadoBlacklist(estado: EmailBlacklistFiltroEstado | null): void {
		this._filterEstadoBlacklist.set(estado);
	}

	protected override onClearFiltros(): void {
		this._filterMotivo.set(null);
		this._filterEstadoBlacklist.set(null);
	}
	// #endregion

	// #region Drawer
	openDrawer(item: EmailBlacklistEntry): void {
		this._drawerItem.set(item);
		this._drawerVisible.set(true);
	}

	closeDrawer(): void {
		this._drawerVisible.set(false);
		this._drawerItem.set(null);
	}
	// #endregion

	// #region Table ready
	setTableReady(ready: boolean): void {
		this._tableReady.set(ready);
	}
	// #endregion

	// #region Trend
	setTrend(data: readonly number[]): void {
		this._trend.set(data);
	}

	setTrendLoading(loading: boolean): void {
		this._trendLoading.set(loading);
	}
	// #endregion

	// #region Estadísticas helpers
	/**
	 * Decrementa `activas` y aumenta `inactivas` al despejar (una sola
	 * llamada para mantener consistencia de la card "estado").
	 */
	onDespejado(): void {
		this.incrementarEstadistica('activas', -1);
		this.incrementarEstadistica('inactivas', 1);
	}

	/** Incrementa `total` y `activas` al crear una entrada nueva. */
	onCreado(): void {
		this.incrementarEstadistica('total', 1);
		this.incrementarEstadistica('activas', 1);
	}
	// #endregion
}
