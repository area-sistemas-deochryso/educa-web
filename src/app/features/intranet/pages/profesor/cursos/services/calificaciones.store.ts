import { Injectable, computed, signal } from '@angular/core';
import {
	CalificacionConNotasDto,
	PeriodoCalificacionDto,
	CalificacionDto,
	ProfesorEstudianteSalonDto,
	GrupoContenidoDto,
} from '../../models';

interface CalificacionesState {
	calificaciones: CalificacionConNotasDto[];
	periodos: PeriodoCalificacionDto[];
	salonEstudiantes: ProfesorEstudianteSalonDto[];
	gruposForCalificar: GrupoContenidoDto[];
	loading: boolean;
	saving: boolean;
	// #region Dialog state
	calificacionDialogVisible: boolean;
	calificarDialogVisible: boolean;
	periodosDialogVisible: boolean;
	selectedCalificacion: CalificacionConNotasDto | null;
	editingCalificacion: CalificacionDto | null;
	// #endregion
}

const initialState: CalificacionesState = {
	calificaciones: [],
	periodos: [],
	salonEstudiantes: [],
	gruposForCalificar: [],
	loading: false,
	saving: false,
	calificacionDialogVisible: false,
	calificarDialogVisible: false,
	periodosDialogVisible: false,
	selectedCalificacion: null,
	editingCalificacion: null,
};

@Injectable({ providedIn: 'root' })
export class CalificacionesStore {
	// #region Estado privado
	private readonly _state = signal<CalificacionesState>(initialState);
	// #endregion

	// #region Lecturas publicas
	readonly calificaciones = computed(() => this._state().calificaciones);
	readonly periodos = computed(() => this._state().periodos);
	readonly salonEstudiantes = computed(() => this._state().salonEstudiantes);
	readonly gruposForCalificar = computed(() => this._state().gruposForCalificar);
	readonly loading = computed(() => this._state().loading);
	readonly saving = computed(() => this._state().saving);
	readonly calificacionDialogVisible = computed(() => this._state().calificacionDialogVisible);
	readonly calificarDialogVisible = computed(() => this._state().calificarDialogVisible);
	readonly periodosDialogVisible = computed(() => this._state().periodosDialogVisible);
	readonly selectedCalificacion = computed(() => this._state().selectedCalificacion);
	readonly editingCalificacion = computed(() => this._state().editingCalificacion);
	// #endregion

	// #region Computed
	readonly calificacionesPorSemana = computed(() => {
		const cals = this.calificaciones();
		const grouped = new Map<number, CalificacionConNotasDto[]>();
		for (const cal of cals) {
			const key = cal.numeroSemana;
			const list = grouped.get(key) ?? [];
			list.push(cal);
			grouped.set(key, list);
		}
		return grouped;
	});

	readonly totalEvaluaciones = computed(() => this.calificaciones().length);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		calificaciones: this.calificaciones(),
		calificacionesPorSemana: this.calificacionesPorSemana(),
		periodos: this.periodos(),
		salonEstudiantes: this.salonEstudiantes(),
		gruposForCalificar: this.gruposForCalificar(),
		loading: this.loading(),
		saving: this.saving(),
		totalEvaluaciones: this.totalEvaluaciones(),
		calificacionDialogVisible: this.calificacionDialogVisible(),
		calificarDialogVisible: this.calificarDialogVisible(),
		periodosDialogVisible: this.periodosDialogVisible(),
		selectedCalificacion: this.selectedCalificacion(),
		editingCalificacion: this.editingCalificacion(),
	}));
	// #endregion

	// #region Comandos de mutacion
	setCalificaciones(calificaciones: CalificacionConNotasDto[]): void {
		this._state.update((s) => ({ ...s, calificaciones }));
	}

	setPeriodos(periodos: PeriodoCalificacionDto[]): void {
		this._state.update((s) => ({ ...s, periodos }));
	}

	setSalonEstudiantes(estudiantes: ProfesorEstudianteSalonDto[]): void {
		this._state.update((s) => ({ ...s, salonEstudiantes: estudiantes }));
	}

	setGruposForCalificar(grupos: GrupoContenidoDto[]): void {
		this._state.update((s) => ({ ...s, gruposForCalificar: grupos }));
	}

	setLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, loading }));
	}

	setSaving(saving: boolean): void {
		this._state.update((s) => ({ ...s, saving }));
	}

	addCalificacion(cal: CalificacionConNotasDto): void {
		this._state.update((s) => ({
			...s,
			calificaciones: [...s.calificaciones, cal],
		}));
	}

	removeCalificacion(calificacionId: number): void {
		this._state.update((s) => ({
			...s,
			calificaciones: s.calificaciones.filter((c) => c.id !== calificacionId),
		}));
	}

	/** Update notas for a specific calificacion after batch grading. */
	updateCalificacionNotas(calificacionId: number, notas: CalificacionConNotasDto['notas']): void {
		this._state.update((s) => ({
			...s,
			calificaciones: s.calificaciones.map((c) =>
				c.id === calificacionId ? { ...c, notas } : c,
			),
		}));
	}

	/** Replace a calificacion in-place (e.g. after type change). */
	replaceCalificacion(cal: CalificacionConNotasDto): void {
		this._state.update((s) => ({
			...s,
			calificaciones: s.calificaciones.map((c) => (c.id === cal.id ? cal : c)),
		}));
	}

	addPeriodo(periodo: PeriodoCalificacionDto): void {
		this._state.update((s) => ({
			...s,
			periodos: [...s.periodos, periodo].sort((a, b) => a.orden - b.orden),
		}));
	}

	removePeriodo(periodoId: number): void {
		this._state.update((s) => ({
			...s,
			periodos: s.periodos.filter((p) => p.id !== periodoId),
		}));
	}
	// #endregion

	// #region Comandos de UI
	openCalificacionDialog(editing: CalificacionDto | null = null): void {
		this._state.update((s) => ({
			...s,
			calificacionDialogVisible: true,
			editingCalificacion: editing,
		}));
	}

	closeCalificacionDialog(): void {
		this._state.update((s) => ({
			...s,
			calificacionDialogVisible: false,
			editingCalificacion: null,
		}));
	}

	openCalificarDialog(cal: CalificacionConNotasDto): void {
		this._state.update((s) => ({
			...s,
			calificarDialogVisible: true,
			selectedCalificacion: cal,
		}));
	}

	closeCalificarDialog(): void {
		this._state.update((s) => ({
			...s,
			calificarDialogVisible: false,
			selectedCalificacion: null,
			gruposForCalificar: [],
		}));
	}

	openPeriodosDialog(): void {
		this._state.update((s) => ({ ...s, periodosDialogVisible: true }));
	}

	closePeriodosDialog(): void {
		this._state.update((s) => ({ ...s, periodosDialogVisible: false }));
	}

	reset(): void {
		this._state.set(initialState);
	}
	// #endregion
}
