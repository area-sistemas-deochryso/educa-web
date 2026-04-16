import { Injectable, computed, signal } from '@angular/core';
import {
	AsistenciaCursoFechaDto,
	AsistenciaCursoResumenDto,
	EstadoAsistenciaCurso,
} from '../../models';

interface AsistenciaCursoState {
	// #region Registro
	registroData: AsistenciaCursoFechaDto | null;
	registroLoading: boolean;
	registroSaving: boolean;
	// #endregion
	// #region Resumen
	resumen: AsistenciaCursoResumenDto | null;
	resumenLoading: boolean;
	// #endregion
}

const initialState: AsistenciaCursoState = {
	registroData: null,
	registroLoading: false,
	registroSaving: false,
	resumen: null,
	resumenLoading: false,
};

@Injectable({ providedIn: 'root' })
export class AttendanceCourseStore {
	// #region Estado privado
	private readonly _state = signal<AsistenciaCursoState>(initialState);
	// #endregion

	// #region Lecturas publicas
	readonly registroData = computed(() => this._state().registroData);
	readonly registroLoading = computed(() => this._state().registroLoading);
	readonly registroSaving = computed(() => this._state().registroSaving);
	readonly resumen = computed(() => this._state().resumen);
	readonly resumenLoading = computed(() => this._state().resumenLoading);
	// #endregion

	// #region Computed
	readonly registroEstudiantes = computed(() => this.registroData()?.estudiantes ?? []);

	readonly registroStats = computed(() => {
		const estudiantes = this.registroEstudiantes();
		return {
			total: estudiantes.length,
			presentes: estudiantes.filter((e) => e.estado === 'P').length,
			tardes: estudiantes.filter((e) => e.estado === 'T').length,
			faltas: estudiantes.filter((e) => e.estado === 'F').length,
		};
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		registroData: this.registroData(),
		registroEstudiantes: this.registroEstudiantes(),
		registroLoading: this.registroLoading(),
		registroSaving: this.registroSaving(),
		registroStats: this.registroStats(),
		resumen: this.resumen(),
		resumenLoading: this.resumenLoading(),
	}));
	// #endregion

	// #region Comandos de mutacion
	setRegistroData(data: AsistenciaCursoFechaDto | null): void {
		this._state.update((s) => ({ ...s, registroData: data }));
	}

	setRegistroLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, registroLoading: loading }));
	}

	setRegistroSaving(saving: boolean): void {
		this._state.update((s) => ({ ...s, registroSaving: saving }));
	}

	setResumen(resumen: AsistenciaCursoResumenDto | null): void {
		this._state.update((s) => ({ ...s, resumen }));
	}

	setResumenLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, resumenLoading: loading }));
	}
	// #endregion

	// #region Mutaciones quirurgicas
	/** Update a single student's attendance state. */
	updateEstudianteEstado(estudianteId: number, estado: EstadoAsistenciaCurso): void {
		this._state.update((s) => {
			if (!s.registroData) return s;
			return {
				...s,
				registroData: {
					...s.registroData,
					estudiantes: s.registroData.estudiantes.map((e) =>
						e.estudianteId === estudianteId
							? { ...e, estado, justificacion: estado === 'P' ? null : e.justificacion }
							: e,
					),
				},
			};
		});
	}

	/** Update a single student's justification text. */
	updateEstudianteJustificacion(estudianteId: number, justificacion: string | null): void {
		this._state.update((s) => {
			if (!s.registroData) return s;
			return {
				...s,
				registroData: {
					...s.registroData,
					estudiantes: s.registroData.estudiantes.map((e) =>
						e.estudianteId === estudianteId ? { ...e, justificacion } : e,
					),
				},
			};
		});
	}

	reset(): void {
		this._state.set(initialState);
	}
	// #endregion
}
