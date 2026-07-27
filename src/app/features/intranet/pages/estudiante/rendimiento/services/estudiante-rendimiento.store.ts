import { Injectable, computed, signal } from '@angular/core';
import { RendimientoPropioCursoDto } from './estudiante-rendimiento.models';

interface EstudianteRendimientoState {
	cursos: RendimientoPropioCursoDto[];
	loading: boolean;
	error: string | null;
}

const initialState: EstudianteRendimientoState = {
	cursos: [],
	loading: false,
	error: null,
};

@Injectable({ providedIn: 'root' })
export class EstudianteRendimientoStore {
	// #region Estado privado
	private readonly _state = signal<EstudianteRendimientoState>(initialState);
	// #endregion

	// #region Lecturas públicas
	readonly cursos = computed(() => this._state().cursos);
	readonly loading = computed(() => this._state().loading);
	readonly error = computed(() => this._state().error);
	// #endregion

	// #region Computed
	readonly vm = computed(() => ({
		cursos: this.cursos(),
		loading: this.loading(),
		error: this.error(),
		isEmpty: this.cursos().length === 0,
	}));
	// #endregion

	// #region Comandos de mutación
	setCursos(cursos: RendimientoPropioCursoDto[]): void {
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
