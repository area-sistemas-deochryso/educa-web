import { computed, Injectable, signal } from '@angular/core';

import type { SedeSimpleDto } from '../../users/models';
import {
	emptyPanelDto,
	getDefaultPanelFilters,
	type AttendancePanelDto,
	type AttendancePanelFilters,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AttendancePanelStore {
	// #region Estado privado
	private readonly _filters = signal<AttendancePanelFilters>(getDefaultPanelFilters());
	private readonly _dto = signal<AttendancePanelDto>(emptyPanelDto());
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _sedes = signal<SedeSimpleDto[]>([]);
	// #endregion

	// #region Lecturas públicas
	readonly filters = this._filters.asReadonly();
	readonly dto = this._dto.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly sedes = this._sedes.asReadonly();
	// #endregion

	// #region Computed
	readonly hasData = computed(() => this._dto().breakdown.length > 0 || this._dto().kpis.porcentajeAsistencia > 0);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		filters: this._filters(),
		dto: this._dto(),
		loading: this._loading(),
		error: this._error(),
		hasData: this.hasData(),
		sedes: this._sedes(),
	}));
	// #endregion

	// #region Comandos de mutación
	updateFilters(partial: Partial<AttendancePanelFilters>): void {
		this._filters.update((f) => ({ ...f, ...partial }));
	}

	setDto(dto: AttendancePanelDto): void {
		this._dto.set(dto);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	setSedes(sedes: SedeSimpleDto[]): void {
		this._sedes.set(sedes);
	}
	// #endregion
}
