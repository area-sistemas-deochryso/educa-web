import { Injectable, computed, signal } from '@angular/core';
import {
	HorarioProfesorDto,
	CursoContenidoDetalleDto,
	EstudianteArchivoDto,
	EstudianteTareaArchivoDto,
	EstudianteMisNotasDto,
	MiAsistenciaCursoResumenDto,
} from '../models';

interface EstudianteCursosState {
	horarios: HorarioProfesorDto[];
	contenido: CursoContenidoDetalleDto | null;
	loading: boolean;
	contentLoading: boolean;
	saving: boolean;
	error: string | null;
	contentDialogVisible: boolean;
	/** Student's own files keyed by semanaId. */
	misArchivos: Record<number, EstudianteArchivoDto[]>;
	/** Semana IDs already loaded. */
	loadedSemanas: number[];
	/** Student's own task files keyed by tareaId. */
	misTareaArchivos: Record<number, EstudianteTareaArchivoDto[]>;
	/** Tarea IDs already loaded. */
	loadedTareas: number[];
	// #region Sub-modal state
	archivosSummaryDialogVisible: boolean;
	tareasSummaryDialogVisible: boolean;
	// #endregion
	// #region Grades & attendance (tab data)
	misNotasCurso: EstudianteMisNotasDto | null;
	misNotasLoading: boolean;
	miAsistencia: MiAsistenciaCursoResumenDto | null;
	miAsistenciaLoading: boolean;
	// #endregion
}

const initialState: EstudianteCursosState = {
	horarios: [],
	contenido: null,
	loading: false,
	contentLoading: false,
	saving: false,
	error: null,
	contentDialogVisible: false,
	misArchivos: {},
	loadedSemanas: [],
	misTareaArchivos: {},
	loadedTareas: [],
	archivosSummaryDialogVisible: false,
	tareasSummaryDialogVisible: false,
	misNotasCurso: null,
	misNotasLoading: false,
	miAsistencia: null,
	miAsistenciaLoading: false,
};

@Injectable({ providedIn: 'root' })
export class EstudianteCursosStore {
	// #region Estado privado
	private readonly _state = signal<EstudianteCursosState>(initialState);

	// #endregion
	// #region Lecturas publicas
	readonly horarios = computed(() => this._state().horarios);
	readonly contenido = computed(() => this._state().contenido);
	readonly loading = computed(() => this._state().loading);
	readonly contentLoading = computed(() => this._state().contentLoading);
	readonly saving = computed(() => this._state().saving);
	readonly error = computed(() => this._state().error);
	readonly contentDialogVisible = computed(() => this._state().contentDialogVisible);
	readonly misArchivos = computed(() => this._state().misArchivos);
	readonly loadedSemanas = computed(() => this._state().loadedSemanas);
	readonly misTareaArchivos = computed(() => this._state().misTareaArchivos);
	readonly loadedTareas = computed(() => this._state().loadedTareas);
	readonly archivosSummaryDialogVisible = computed(() => this._state().archivosSummaryDialogVisible);
	readonly tareasSummaryDialogVisible = computed(() => this._state().tareasSummaryDialogVisible);
	readonly misNotasCurso = computed(() => this._state().misNotasCurso);
	readonly misNotasLoading = computed(() => this._state().misNotasLoading);
	readonly miAsistencia = computed(() => this._state().miAsistencia);
	readonly miAsistenciaLoading = computed(() => this._state().miAsistenciaLoading);

	// #endregion
	// #region Computed derivados
	readonly semanas = computed(() => this.contenido()?.semanas ?? []);
	readonly totalArchivos = computed(() =>
		this.semanas().reduce((sum, s) => sum + s.archivos.length, 0),
	);
	readonly totalTareas = computed(() =>
		this.semanas().reduce((sum, s) => sum + s.tareas.length, 0),
	);

	// #endregion
	// #region ViewModel
	readonly vm = computed(() => ({
		horarios: this.horarios(),
		contenido: this.contenido(),
		semanas: this.semanas(),
		loading: this.loading(),
		contentLoading: this.contentLoading(),
		saving: this.saving(),
		error: this.error(),
		totalArchivos: this.totalArchivos(),
		totalTareas: this.totalTareas(),
		contentDialogVisible: this.contentDialogVisible(),
		misArchivos: this.misArchivos(),
		misTareaArchivos: this.misTareaArchivos(),
		archivosSummaryDialogVisible: this.archivosSummaryDialogVisible(),
		tareasSummaryDialogVisible: this.tareasSummaryDialogVisible(),
		misNotasCurso: this.misNotasCurso(),
		misNotasLoading: this.misNotasLoading(),
		miAsistencia: this.miAsistencia(),
		miAsistenciaLoading: this.miAsistenciaLoading(),
	}));

	// #endregion
	// #region Comandos de mutacion
	setHorarios(horarios: HorarioProfesorDto[]): void {
		this._state.update((s) => ({ ...s, horarios }));
	}

	setContenido(contenido: CursoContenidoDetalleDto | null): void {
		this._state.update((s) => ({ ...s, contenido }));
	}

	setLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, loading }));
	}

	setContentLoading(contentLoading: boolean): void {
		this._state.update((s) => ({ ...s, contentLoading }));
	}

	setSaving(saving: boolean): void {
		this._state.update((s) => ({ ...s, saving }));
	}

	setError(error: string | null): void {
		this._state.update((s) => ({ ...s, error }));
	}

	setMisNotasCurso(misNotasCurso: EstudianteMisNotasDto | null): void {
		this._state.update((s) => ({ ...s, misNotasCurso }));
	}

	setMisNotasLoading(misNotasLoading: boolean): void {
		this._state.update((s) => ({ ...s, misNotasLoading }));
	}

	setMiAsistencia(miAsistencia: MiAsistenciaCursoResumenDto | null): void {
		this._state.update((s) => ({ ...s, miAsistencia }));
	}

	setMiAsistenciaLoading(miAsistenciaLoading: boolean): void {
		this._state.update((s) => ({ ...s, miAsistenciaLoading }));
	}

	// #endregion
	// #region Student file mutations
	setMisArchivos(semanaId: number, archivos: EstudianteArchivoDto[]): void {
		this._state.update((s) => ({
			...s,
			misArchivos: { ...s.misArchivos, [semanaId]: archivos },
			loadedSemanas: s.loadedSemanas.includes(semanaId)
				? s.loadedSemanas
				: [...s.loadedSemanas, semanaId],
		}));
	}

	addMiArchivo(semanaId: number, archivo: EstudianteArchivoDto): void {
		this._state.update((s) => ({
			...s,
			misArchivos: {
				...s.misArchivos,
				[semanaId]: [...(s.misArchivos[semanaId] ?? []), archivo],
			},
		}));
	}

	removeMiArchivo(semanaId: number, archivoId: number): void {
		this._state.update((s) => ({
			...s,
			misArchivos: {
				...s.misArchivos,
				[semanaId]: (s.misArchivos[semanaId] ?? []).filter((a) => a.id !== archivoId),
			},
		}));
	}

	// #endregion
	// #region Student task file mutations

	setMisTareaArchivos(tareaId: number, archivos: EstudianteTareaArchivoDto[]): void {
		this._state.update((s) => ({
			...s,
			misTareaArchivos: { ...s.misTareaArchivos, [tareaId]: archivos },
			loadedTareas: s.loadedTareas.includes(tareaId)
				? s.loadedTareas
				: [...s.loadedTareas, tareaId],
		}));
	}

	addMiTareaArchivo(tareaId: number, archivo: EstudianteTareaArchivoDto): void {
		this._state.update((s) => ({
			...s,
			misTareaArchivos: {
				...s.misTareaArchivos,
				[tareaId]: [...(s.misTareaArchivos[tareaId] ?? []), archivo],
			},
		}));
	}

	removeMiTareaArchivo(tareaId: number, archivoId: number): void {
		this._state.update((s) => ({
			...s,
			misTareaArchivos: {
				...s.misTareaArchivos,
				[tareaId]: (s.misTareaArchivos[tareaId] ?? []).filter((a) => a.id !== archivoId),
			},
		}));
	}

	// #endregion
	// #region Dialog commands
	openContentDialog(): void {
		this._state.update((s) => ({ ...s, contentDialogVisible: true }));
	}

	closeContentDialog(): void {
		this._state.update((s) => ({
			...s,
			contentDialogVisible: false,
			contenido: null,
			misArchivos: {},
			loadedSemanas: [],
			misTareaArchivos: {},
			loadedTareas: [],
			misNotasCurso: null,
			misNotasLoading: false,
			miAsistencia: null,
			miAsistenciaLoading: false,
		}));
	}

	openArchivosSummaryDialog(): void {
		this._state.update((s) => ({ ...s, archivosSummaryDialogVisible: true }));
	}

	closeArchivosSummaryDialog(): void {
		this._state.update((s) => ({ ...s, archivosSummaryDialogVisible: false }));
	}

	openTareasSummaryDialog(): void {
		this._state.update((s) => ({ ...s, tareasSummaryDialogVisible: true }));
	}

	closeTareasSummaryDialog(): void {
		this._state.update((s) => ({ ...s, tareasSummaryDialogVisible: false }));
	}

	/** Clear loaded caches so content can be re-fetched on refresh. */
	clearLoadedCaches(): void {
		this._state.update((s) => ({
			...s,
			misArchivos: {},
			loadedSemanas: [],
			misTareaArchivos: {},
			loadedTareas: [],
		}));
	}
	// #endregion
}
