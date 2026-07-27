import { Injectable, computed, signal } from '@angular/core';

import { calcularKpis, ordenarPorOutlier, ReporteRendimientoDto } from '../models';

interface AdminRendimientoState {
	cursos: ReporteRendimientoDto[];
	loading: boolean;
	error: string | null;
}

const initialState: AdminRendimientoState = {
	cursos: [],
	loading: false,
	error: null,
};

@Injectable({ providedIn: 'root' })
export class AdminRendimientoStore {
	// #region Estado privado
	private readonly _state = signal<AdminRendimientoState>(initialState);
	// #endregion

	// #region Lecturas públicas
	readonly cursos = computed(() => this._state().cursos);
	readonly loading = computed(() => this._state().loading);
	readonly error = computed(() => this._state().error);
	// #endregion

	// #region Computed
	/** Cursos ordenados de mayor a menor desvío — el diferencial de valor del panel (brief 495). */
	readonly cursosOrdenados = computed(() => ordenarPorOutlier(this.cursos()));

	readonly kpis = computed(() => calcularKpis(this.cursos()));

	readonly vm = computed(() => ({
		cursos: this.cursosOrdenados(),
		kpis: this.kpis(),
		loading: this.loading(),
		error: this.error(),
		isEmpty: this.cursos().length === 0,
	}));
	// #endregion

	// #region Comandos de mutación
	setCursos(cursos: ReporteRendimientoDto[]): void {
		this._state.update((s) => ({ ...s, cursos }));
	}

	setLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, loading }));
	}

	setError(error: string | null): void {
		this._state.update((s) => ({ ...s, error }));
	}

	reset(): void {
		this._state.set(initialState);
	}
	// #endregion
}
