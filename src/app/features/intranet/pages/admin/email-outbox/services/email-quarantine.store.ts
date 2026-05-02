import { Injectable, computed, signal } from '@angular/core';

import { BaseCrudStore } from '@core/store/base/base-crud.store';
import {
	EmailQuarantineEstadisticas,
	EmailQuarantineFiltroEstado,
	EmailQuarantineFormData,
	EmailQuarantineListaDto,
	QuarantineMotivo,
} from '@data/models/email-quarantine.models';

const DEFAULT_FORM: EmailQuarantineFormData = {
	destinatario: '',
	motivo: 'MANUAL',
	durationHours: 24,
	observacion: '',
};

/**
 * Plan 37 Chat 3 — store del tab Cuarentena.
 * Extiende `BaseCrudStore` (loading / paginación / dialog / form / stats /
 * mutaciones quirúrgicas). Agrega filtros específicos, drawer detalle,
 * `tableReady` (skeleton), y un signal opcional con el detalle expandido
 * para el drawer (`drawerDetalle`).
 */
@Injectable({ providedIn: 'root' })
export class EmailQuarantineStore extends BaseCrudStore<
	EmailQuarantineListaDto,
	EmailQuarantineFormData,
	EmailQuarantineEstadisticas
> {
	// #region Estado privado adicional
	private readonly _filterMotivo = signal<QuarantineMotivo | null>(null);
	private readonly _filterEstadoQ = signal<EmailQuarantineFiltroEstado | null>('activa');
	private readonly _drawerVisible = signal(false);
	private readonly _drawerItem = signal<EmailQuarantineListaDto | null>(null);
	private readonly _tableReady = signal(false);
	// #endregion

	// #region Lecturas adicionales
	readonly filterMotivo = this._filterMotivo.asReadonly();
	readonly filterEstadoQuarantine = this._filterEstadoQ.asReadonly();
	readonly drawerVisible = this._drawerVisible.asReadonly();
	readonly drawerItem = this._drawerItem.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();

	readonly hasActiveFilters = computed(
		() => !!this.searchTerm() || !!this._filterMotivo() || !!this._filterEstadoQ(),
	);
	// #endregion

	constructor() {
		super(DEFAULT_FORM);
	}

	protected override getDefaultFormData(): EmailQuarantineFormData {
		return { ...DEFAULT_FORM };
	}

	// #region Filtros específicos
	setFilterMotivo(motivo: QuarantineMotivo | null): void {
		this._filterMotivo.set(motivo);
	}

	setFilterEstadoQuarantine(estado: EmailQuarantineFiltroEstado | null): void {
		this._filterEstadoQ.set(estado);
	}

	protected override onClearFiltros(): void {
		this._filterMotivo.set(null);
		this._filterEstadoQ.set('activa');
	}
	// #endregion

	// #region Drawer
	openDrawer(item: EmailQuarantineListaDto): void {
		this._drawerItem.set(item);
		this._drawerVisible.set(true);
	}

	closeDrawer(): void {
		this._drawerVisible.set(false);
		this._drawerItem.set(null);
	}
	// #endregion

	// #region Skeleton
	setTableReady(ready: boolean): void {
		this._tableReady.set(ready);
	}
	// #endregion

	// #region Stats helpers
	onLiberada(): void {
		this.incrementarEstadistica('activas', -1);
		this.incrementarEstadistica('liberadas', 1);
	}

	onCreada(): void {
		this.incrementarEstadistica('total', 1);
		this.incrementarEstadistica('activas', 1);
	}
	// #endregion
}
