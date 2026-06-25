import { Injectable, computed, signal } from '@angular/core';

import { BaseCrudStore } from '@core/store';
import {
	DomainPauseMotivo,
	EmailDomainPauseEstadisticas,
	EmailDomainPauseFiltroEstado,
	EmailDomainPauseFormData,
	EmailDomainPauseListaDto,
} from '@data/models';

const DEFAULT_FORM: EmailDomainPauseFormData = {
	dominio: '',
	motivo: 'MANUAL',
	durationHours: 6,
	observacion: '',
};

/**
 * Plan 37 Chat 3 — store del tab Dominios pausados (≤ 50 filas → client-side).
 */
@Injectable({ providedIn: 'root' })
export class EmailDomainPauseStore extends BaseCrudStore<
	EmailDomainPauseListaDto,
	EmailDomainPauseFormData,
	EmailDomainPauseEstadisticas
> {
	private readonly _filterMotivo = signal<DomainPauseMotivo | null>(null);
	private readonly _filterEstadoPausa = signal<EmailDomainPauseFiltroEstado | null>(null);
	private readonly _tableReady = signal(false);

	readonly filterMotivo = this._filterMotivo.asReadonly();
	readonly filterEstadoPausa = this._filterEstadoPausa.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();

	readonly hasActiveFilters = computed(
		() => !!this.searchTerm() || !!this._filterMotivo() || !!this._filterEstadoPausa(),
	);

	readonly activeCount = computed(() => this.items().filter((i) => i.estado).length);

	constructor() {
		super(DEFAULT_FORM);
	}

	protected override getDefaultFormData(): EmailDomainPauseFormData {
		return { ...DEFAULT_FORM };
	}

	setFilterMotivo(motivo: DomainPauseMotivo | null): void {
		this._filterMotivo.set(motivo);
	}

	setFilterEstadoPausa(estado: EmailDomainPauseFiltroEstado | null): void {
		this._filterEstadoPausa.set(estado);
	}

	protected override onClearFiltros(): void {
		this._filterMotivo.set(null);
		this._filterEstadoPausa.set(null);
	}

	setTableReady(ready: boolean): void {
		this._tableReady.set(ready);
	}

	onLiberada(): void {
		this.incrementarEstadistica('activas', -1);
		this.incrementarEstadistica('liberadas', 1);
	}

	onCreada(): void {
		this.incrementarEstadistica('total', 1);
		this.incrementarEstadistica('activas', 1);
	}
}
