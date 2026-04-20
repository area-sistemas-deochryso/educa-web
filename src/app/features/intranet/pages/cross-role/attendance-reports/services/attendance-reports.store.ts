import { computed, Injectable, signal } from '@angular/core';
import type { SalonProfesor } from '@data/models/attendance.models';
import {
	getDefaultFilters,
	type ReporteFiltrado,
	type ReporteFilters,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AttendanceReportsStore {
	// #region Estado privado
	private readonly _filters = signal<ReporteFilters>(getDefaultFilters());
	private readonly _salonesDisponibles = signal<SalonProfesor[]>([]);
	private readonly _resultado = signal<ReporteFiltrado | null>(null);
	private readonly _loading = signal(false);
	private readonly _loadingSalones = signal(false);
	private readonly _exporting = signal(false);
	private readonly _error = signal<string | null>(null);
	// #endregion

	// #region Lecturas públicas
	readonly filters = this._filters.asReadonly();
	readonly salonesDisponibles = this._salonesDisponibles.asReadonly();
	readonly resultado = this._resultado.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly loadingSalones = this._loadingSalones.asReadonly();
	readonly exporting = this._exporting.asReadonly();
	readonly error = this._error.asReadonly();
	// #endregion

	// #region Computed
	readonly hasResultado = computed(() => this._resultado() !== null);
	readonly hasData = computed(() => {
		const r = this._resultado();
		if (r === null) return false;
		const profCount = r.profesores?.length ?? 0;
		return r.totalFiltrados > 0 || profCount > 0;
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		filters: this._filters(),
		salonesDisponibles: this._salonesDisponibles(),
		resultado: this._resultado(),
		loading: this._loading(),
		loadingSalones: this._loadingSalones(),
		exporting: this._exporting(),
		error: this._error(),
		hasResultado: this.hasResultado(),
		hasData: this.hasData(),
	}));
	// #endregion

	// #region Comandos de mutación
	setSalonesDisponibles(salones: SalonProfesor[]): void {
		this._salonesDisponibles.set(salones);
	}

	setResultado(resultado: ReporteFiltrado | null): void {
		this._resultado.set(resultado);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setLoadingSalones(loading: boolean): void {
		this._loadingSalones.set(loading);
	}

	setExporting(exporting: boolean): void {
		this._exporting.set(exporting);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	updateFilters(partial: Partial<ReporteFilters>): void {
		this._filters.update((f) => ({ ...f, ...partial }));
	}

	reset(): void {
		this._resultado.set(null);
		this._error.set(null);
	}
	// #endregion
}
