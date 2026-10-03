import { Injectable, computed, signal } from '@angular/core';
import {
	AsistenciaCursoEstudianteDto,
	AsistenciaCursoFechaDto,
	AsistenciaCursoResumenDto,
	EstadoAsistenciaCurso,
} from '../../models';

interface AsistenciaCursoState {
	// #region Registro
	registroData: AsistenciaCursoFechaDto | null;
	/** Lista tal como vino del servidor (o como quedó al guardar): referencia para detectar ediciones sin guardar. */
	registroBaseline: AsistenciaCursoEstudianteDto[];
	registroLoading: boolean;
	registroSaving: boolean;
	// #endregion
	// #region Resumen
	resumen: AsistenciaCursoResumenDto | null;
	resumenLoading: boolean;
	resumenError: string | null;
	// #endregion
}

const initialState: AsistenciaCursoState = {
	registroData: null,
	registroBaseline: [],
	registroLoading: false,
	registroSaving: false,
	resumen: null,
	resumenLoading: false,
	resumenError: null,
};

@Injectable({ providedIn: 'root' })
export class AttendanceCourseStore {
	// #region Estado privado
	private readonly _state = signal<AsistenciaCursoState>(initialState);
	// #endregion

	// #region Lecturas publicas
	readonly registroData = computed(() => this._state().registroData);
	private readonly registroBaseline = computed(() => this._state().registroBaseline);
	readonly registroLoading = computed(() => this._state().registroLoading);
	readonly registroSaving = computed(() => this._state().registroSaving);
	readonly resumen = computed(() => this._state().resumen);
	readonly resumenLoading = computed(() => this._state().resumenLoading);
	readonly resumenError = computed(() => this._state().resumenError);
	// #endregion

	// #region Computed
	readonly registroEstudiantes = computed(() => this.registroData()?.estudiantes ?? []);

	/** undefined = backend sin el flag desplegado todavía (no mostrar indicador por error). */
	readonly registroTieneRegistros = computed(() => this.registroData()?.tieneRegistros);

	readonly registroStats = computed(() => {
		const estudiantes = this.registroEstudiantes();
		return {
			total: estudiantes.length,
			presentes: estudiantes.filter((e) => e.estado === 'P').length,
			tardes: estudiantes.filter((e) => e.estado === 'T').length,
			faltas: estudiantes.filter((e) => e.estado === 'F').length,
		};
	});

	/** true si algún estudiante cambió de estado o justificación respecto de lo cargado/guardado. */
	readonly registroDirty = computed(() => {
		const baseline = new Map(this.registroBaseline().map((e) => [e.estudianteId, e]));
		return this.registroEstudiantes().some((e) => {
			const original = baseline.get(e.estudianteId);
			return !original || original.estado !== e.estado || (original.justificacion || null) !== (e.justificacion || null);
		});
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		registroData: this.registroData(),
		registroEstudiantes: this.registroEstudiantes(),
		registroLoading: this.registroLoading(),
		registroSaving: this.registroSaving(),
		registroStats: this.registroStats(),
		registroTieneRegistros: this.registroTieneRegistros(),
		registroDirty: this.registroDirty(),
		resumen: this.resumen(),
		resumenLoading: this.resumenLoading(),
		resumenError: this.resumenError(),
	}));
	// #endregion

	// #region Comandos de mutacion
	setRegistroData(data: AsistenciaCursoFechaDto | null): void {
		this._state.update((s) => ({ ...s, registroData: data, registroBaseline: data?.estudiantes ?? [] }));
	}

	/** Tras guardar: lo mostrado pasa a ser la nueva referencia (ya no hay ediciones pendientes). */
	markRegistroSaved(): void {
		this._state.update((s) => ({ ...s, registroBaseline: s.registroData?.estudiantes ?? [] }));
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

	setResumenError(error: string | null): void {
		this._state.update((s) => ({ ...s, resumenError: error }));
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
