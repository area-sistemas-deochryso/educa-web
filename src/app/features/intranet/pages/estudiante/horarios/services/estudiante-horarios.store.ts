import { Injectable, signal, computed } from '@angular/core';
import { HorarioProfesorDto } from '../../models';

@Injectable({ providedIn: 'root' })
export class EstudianteHorariosStore {
	// #region Estado privado
	private readonly _horarios = signal<HorarioProfesorDto[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	// #endregion

	// #region Lecturas públicas
	readonly horarios = this._horarios.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	// #endregion

	// #region Computed
	readonly isEmpty = computed(() => this._horarios().length === 0);

	readonly vm = computed(() => ({
		horarios: this.horarios(),
		loading: this.loading(),
		error: this.error(),
		isEmpty: this.isEmpty(),
	}));
	// #endregion

	// #region Comandos
	setHorarios(horarios: HorarioProfesorDto[]): void {
		this._horarios.set(horarios);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}
	// #endregion
}
