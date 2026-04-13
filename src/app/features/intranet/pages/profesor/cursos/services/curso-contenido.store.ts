import { Injectable, computed, signal } from '@angular/core';
import {
	CursoContenidoDetalleDto,
	CursoContenidoSemanaDto,
	CursoContenidoArchivoDto,
	CursoContenidoTareaDto,
	TareaArchivoDto,
	SemanaEstudianteArchivosDto,
	EstudianteTareaArchivosGroupDto,
} from '../../models';
import { contenidoMutations, type ContenidoMutation } from './curso-contenido.mutations';

// #region State interfaces

interface DomainState {
	contenido: CursoContenidoDetalleDto | null;
	/** SalonId del horario asociado al contenido (resuelto por el caller). */
	salonId: number | null;
	loading: boolean;
	saving: boolean;
	error: string | null;
}

interface UiState {
	contentDialogVisible: boolean;
	builderDialogVisible: boolean;
	semanaEditDialogVisible: boolean;
	tareaDialogVisible: boolean;
	selectedSemana: CursoContenidoSemanaDto | null;
	selectedTarea: CursoContenidoTareaDto | null;
	selectedHorarioId: number | null;
	archivosSummaryDialogVisible: boolean;
	tareasSummaryDialogVisible: boolean;
	studentFilesDialogVisible: boolean;
	studentFilesData: SemanaEstudianteArchivosDto[];
	studentFilesLoading: boolean;
	initialTab: string | null;
	taskSubmissionsDialogVisible: boolean;
	taskSubmissionsData: EstudianteTareaArchivosGroupDto[];
	taskSubmissionsLoading: boolean;
	taskSubmissionsTarea: CursoContenidoTareaDto | null;
	activeSemanaId: number | null;
}

const initialDomain: DomainState = {
	contenido: null,
	salonId: null,
	loading: false,
	saving: false,
	error: null,
};

const initialUi: UiState = {
	contentDialogVisible: false,
	builderDialogVisible: false,
	semanaEditDialogVisible: false,
	tareaDialogVisible: false,
	selectedSemana: null,
	selectedTarea: null,
	selectedHorarioId: null,
	archivosSummaryDialogVisible: false,
	tareasSummaryDialogVisible: false,
	studentFilesDialogVisible: false,
	studentFilesData: [],
	studentFilesLoading: false,
	initialTab: null,
	taskSubmissionsDialogVisible: false,
	taskSubmissionsData: [],
	taskSubmissionsLoading: false,
	taskSubmissionsTarea: null,
	activeSemanaId: null,
};

// #endregion

@Injectable({ providedIn: 'root' })
export class CursoContenidoStore {
	// #region Estado privado (2 signals independientes)
	private readonly _domain = signal<DomainState>(initialDomain);
	private readonly _ui = signal<UiState>(initialUi);
	// #endregion

	// #region Lecturas públicas — Domain
	readonly contenido = computed(() => this._domain().contenido);
	readonly salonId = computed(() => this._domain().salonId);
	readonly loading = computed(() => this._domain().loading);
	readonly saving = computed(() => this._domain().saving);
	readonly error = computed(() => this._domain().error);
	// #endregion

	// #region Lecturas públicas — UI
	readonly contentDialogVisible = computed(() => this._ui().contentDialogVisible);
	readonly builderDialogVisible = computed(() => this._ui().builderDialogVisible);
	readonly semanaEditDialogVisible = computed(() => this._ui().semanaEditDialogVisible);
	readonly tareaDialogVisible = computed(() => this._ui().tareaDialogVisible);
	readonly selectedSemana = computed(() => this._ui().selectedSemana);
	readonly selectedTarea = computed(() => this._ui().selectedTarea);
	readonly selectedHorarioId = computed(() => this._ui().selectedHorarioId);
	readonly archivosSummaryDialogVisible = computed(() => this._ui().archivosSummaryDialogVisible);
	readonly tareasSummaryDialogVisible = computed(() => this._ui().tareasSummaryDialogVisible);
	readonly studentFilesDialogVisible = computed(() => this._ui().studentFilesDialogVisible);
	readonly studentFilesData = computed(() => this._ui().studentFilesData);
	readonly studentFilesLoading = computed(() => this._ui().studentFilesLoading);
	readonly initialTab = computed(() => this._ui().initialTab);
	readonly taskSubmissionsDialogVisible = computed(() => this._ui().taskSubmissionsDialogVisible);
	readonly taskSubmissionsData = computed(() => this._ui().taskSubmissionsData);
	readonly taskSubmissionsLoading = computed(() => this._ui().taskSubmissionsLoading);
	readonly taskSubmissionsTarea = computed(() => this._ui().taskSubmissionsTarea);
	readonly activeSemanaId = computed(() => this._ui().activeSemanaId);
	// #endregion

	// #region Computed derivados (solo dependen de domain)
	readonly semanas = computed(() => this.contenido()?.semanas ?? []);
	readonly totalArchivos = computed(() =>
		this.semanas().reduce((sum, s) => sum + s.archivos.length, 0),
	);
	readonly totalTareas = computed(() =>
		this.semanas().reduce((sum, s) => sum + s.tareas.length, 0),
	);
	readonly totalArchivosEstudiantes = computed(() =>
		this.studentFilesData().reduce(
			(sum, s) => sum + s.estudiantes.reduce((acc, e) => acc + e.archivos.length, 0),
			0,
		),
	);
	// #endregion

	// #region Sub-ViewModels
	readonly dataVm = computed(() => ({
		contenido: this.contenido(),
		semanas: this.semanas(),
		loading: this.loading(),
		saving: this.saving(),
		error: this.error(),
		totalArchivos: this.totalArchivos(),
		totalTareas: this.totalTareas(),
	}));

	readonly uiVm = computed(() => ({
		contentDialogVisible: this.contentDialogVisible(),
		builderDialogVisible: this.builderDialogVisible(),
		semanaEditDialogVisible: this.semanaEditDialogVisible(),
		tareaDialogVisible: this.tareaDialogVisible(),
		selectedSemana: this.selectedSemana(),
		selectedTarea: this.selectedTarea(),
		selectedHorarioId: this.selectedHorarioId(),
		archivosSummaryDialogVisible: this.archivosSummaryDialogVisible(),
		tareasSummaryDialogVisible: this.tareasSummaryDialogVisible(),
		studentFilesDialogVisible: this.studentFilesDialogVisible(),
		studentFilesData: this.studentFilesData(),
		studentFilesLoading: this.studentFilesLoading(),
		totalArchivosEstudiantes: this.totalArchivosEstudiantes(),
		initialTab: this.initialTab(),
		taskSubmissionsDialogVisible: this.taskSubmissionsDialogVisible(),
		taskSubmissionsData: this.taskSubmissionsData(),
		taskSubmissionsLoading: this.taskSubmissionsLoading(),
		taskSubmissionsTarea: this.taskSubmissionsTarea(),
		activeSemanaId: this.activeSemanaId(),
	}));

	/** Aggregated view model for UI binding (composes sub-VMs). */
	readonly vm = computed(() => ({
		...this.dataVm(),
		...this.uiVm(),
	}));
	// #endregion

	// #region Comandos de mutación — Domain
	setContenido(contenido: CursoContenidoDetalleDto | null): void { this._domain.update((s) => ({ ...s, contenido })); }
	setSalonId(salonId: number | null): void { this._domain.update((s) => ({ ...s, salonId })); }
	setLoading(loading: boolean): void { this._domain.update((s) => ({ ...s, loading })); }
	setSaving(saving: boolean): void { this._domain.update((s) => ({ ...s, saving })); }
	setError(error: string | null): void { this._domain.update((s) => ({ ...s, error })); }
	clearError(): void { this._domain.update((s) => ({ ...s, error: null })); }
	// #endregion

	// #region Comandos de mutación — UI
	setSelectedHorarioId(id: number | null): void { this._ui.update((s) => ({ ...s, selectedHorarioId: id })); }
	setInitialTab(tab: string | null): void { this._ui.update((s) => ({ ...s, initialTab: tab })); }
	setStudentFilesData(data: SemanaEstudianteArchivosDto[]): void { this._ui.update((s) => ({ ...s, studentFilesData: data })); }
	setStudentFilesLoading(loading: boolean): void { this._ui.update((s) => ({ ...s, studentFilesLoading: loading })); }
	setTaskSubmissionsData(data: EstudianteTareaArchivosGroupDto[]): void { this._ui.update((s) => ({ ...s, taskSubmissionsData: data })); }
	setTaskSubmissionsLoading(loading: boolean): void { this._ui.update((s) => ({ ...s, taskSubmissionsLoading: loading })); }
	setActiveSemanaId(id: number | null): void { this._ui.update((s) => ({ ...s, activeSemanaId: id })); }
	// #endregion

	// #region Mutaciones quirúrgicas (domain)
	private applyMutation(mutate: ContenidoMutation): void {
		this._domain.update((s) => (s.contenido ? { ...s, contenido: mutate(s.contenido) } : s));
	}

	updateSemana(semanaId: number, updates: Partial<CursoContenidoSemanaDto>): void {
		this.applyMutation(contenidoMutations.updateSemana(semanaId, updates));
	}

	addArchivoToSemana(semanaId: number, archivo: CursoContenidoArchivoDto): void {
		this.applyMutation(contenidoMutations.addArchivoToSemana(semanaId, archivo));
	}

	removeArchivoFromSemana(semanaId: number, archivoId: number): void {
		this.applyMutation(contenidoMutations.removeArchivoFromSemana(semanaId, archivoId));
	}

	addTareaToSemana(semanaId: number, tarea: CursoContenidoTareaDto): void {
		this.applyMutation(contenidoMutations.addTareaToSemana(semanaId, tarea));
	}

	updateTareaInSemana(semanaId: number, tareaId: number, updates: Partial<CursoContenidoTareaDto>): void {
		this.applyMutation(contenidoMutations.updateTareaInSemana(semanaId, tareaId, updates));
	}

	removeTareaFromSemana(semanaId: number, tareaId: number): void {
		this.applyMutation(contenidoMutations.removeTareaFromSemana(semanaId, tareaId));
	}

	addArchivoToTarea(semanaId: number, tareaId: number, archivo: TareaArchivoDto): void {
		this.applyMutation(contenidoMutations.addArchivoToTarea(semanaId, tareaId, archivo));
	}

	removeArchivoFromTarea(semanaId: number, tareaId: number, archivoId: number): void {
		this.applyMutation(contenidoMutations.removeArchivoFromTarea(semanaId, tareaId, archivoId));
	}
	// #endregion

	// #region Dialog commands (UI)
	openContentDialog(): void { this._ui.update((s) => ({ ...s, contentDialogVisible: true })); }
	closeContentDialog(): void {
		this._ui.update((s) => ({ ...s, contentDialogVisible: false, selectedHorarioId: null }));
		this._domain.update((s) => ({ ...s, contenido: null }));
	}
	openBuilderDialog(): void { this._ui.update((s) => ({ ...s, builderDialogVisible: true })); }
	closeBuilderDialog(): void { this._ui.update((s) => ({ ...s, builderDialogVisible: false })); }
	openSemanaEditDialog(semana: CursoContenidoSemanaDto): void { this._ui.update((s) => ({ ...s, semanaEditDialogVisible: true, selectedSemana: semana })); }
	closeSemanaEditDialog(): void { this._ui.update((s) => ({ ...s, semanaEditDialogVisible: false, selectedSemana: null })); }
	openTareaDialog(tarea: CursoContenidoTareaDto | null): void { this._ui.update((s) => ({ ...s, tareaDialogVisible: true, selectedTarea: tarea })); }
	closeTareaDialog(): void { this._ui.update((s) => ({ ...s, tareaDialogVisible: false, selectedTarea: null })); }
	openArchivosSummaryDialog(): void { this._ui.update((s) => ({ ...s, archivosSummaryDialogVisible: true })); }
	closeArchivosSummaryDialog(): void { this._ui.update((s) => ({ ...s, archivosSummaryDialogVisible: false })); }
	openTareasSummaryDialog(): void { this._ui.update((s) => ({ ...s, tareasSummaryDialogVisible: true })); }
	closeTareasSummaryDialog(): void { this._ui.update((s) => ({ ...s, tareasSummaryDialogVisible: false })); }
	openStudentFilesDialog(): void { this._ui.update((s) => ({ ...s, studentFilesDialogVisible: true })); }
	closeStudentFilesDialog(): void { this._ui.update((s) => ({ ...s, studentFilesDialogVisible: false })); }
	openTaskSubmissionsDialog(tarea: CursoContenidoTareaDto): void { this._ui.update((s) => ({ ...s, taskSubmissionsDialogVisible: true, taskSubmissionsTarea: tarea })); }
	closeTaskSubmissionsDialog(): void { this._ui.update((s) => ({ ...s, taskSubmissionsDialogVisible: false, taskSubmissionsTarea: null })); }
	// #endregion

	// #region Reset
	reset(): void {
		this._domain.set(initialDomain);
		this._ui.set(initialUi);
	}
	// #endregion
}
