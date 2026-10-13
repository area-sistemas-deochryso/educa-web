import { Injectable, computed, signal } from '@angular/core';
import type { ConfiguracionCalificacionListDto } from '@data/models';
import { RendimientoCursoVm, RendimientoPropioCursoDto } from './estudiante-rendimiento.models';

interface EstudianteRendimientoState {
	cursos: RendimientoPropioCursoDto[];
	/** Escala por `cursoContenidoId`, tomada de `mis-notas`. Ausente → numérica. */
	escalas: Record<number, ConfiguracionCalificacionListDto | null>;
	loading: boolean;
	error: string | null;
}

const initialState: EstudianteRendimientoState = {
	cursos: [],
	escalas: {},
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
	private readonly cursosVm = computed<RendimientoCursoVm[]>(() => {
		const escalas = this._state().escalas;
		return this.cursos().map((c) => ({
			...c,
			escala: escalas[c.cursoContenidoId] ?? null,
			puntosCalificados: c.periodos.filter((p) => p.promedio !== null && p.promedio !== undefined).length,
		}));
	});

	readonly vm = computed(() => ({
		cursos: this.cursosVm(),
		loading: this.loading(),
		error: this.error(),
		isEmpty: this.cursos().length === 0,
	}));
	// #endregion

	// #region Comandos de mutación
	setCursos(cursos: RendimientoPropioCursoDto[]): void {
		this._state.update((s) => ({ ...s, cursos }));
	}

	setEscalas(escalas: Record<number, ConfiguracionCalificacionListDto | null>): void {
		this._state.update((s) => ({ ...s, escalas }));
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
