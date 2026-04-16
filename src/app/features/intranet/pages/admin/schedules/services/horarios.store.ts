import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthStore } from '@core/store';
import { type ProfesorCursoListaDto } from '@data/models';
import { isAdminRole } from '@shared/models';
import { CursoListaDto } from '../models/curso.interface';
import { type ImportarHorariosResult } from '../helpers/horario-import.config';
import {
	type HorarioDetalleResponseDto,
	type HorarioResponseDto,
	type HorariosEstadisticas,
} from '../models/horario.interface';
import { ProfesorListDto } from '../models/profesor.interface';
import { SalonListDto } from '../models/salon.interface';
import { SchedulesFormStore } from './horarios-form.store';
import { SchedulesFilterStore } from './horarios-filter.store';
import { SchedulesOptionsStore } from './horarios-options.store';

@Injectable({ providedIn: 'root' })
export class SchedulesStore {
	private authStore = inject(AuthStore);
	readonly formStore = inject(SchedulesFormStore);
	readonly filterStore = inject(SchedulesFilterStore);
	readonly optionsStore = inject(SchedulesOptionsStore);

	// #region Estado privado - Datos
	private readonly _horarios = signal<HorarioResponseDto[]>([]);
	private readonly _horarioDetalle = signal<HorarioDetalleResponseDto | null>(null);
	private readonly _estadisticas = signal<HorariosEstadisticas | null>(null);
	// #endregion

	// #region Estado privado - Loading
	private readonly _error = signal<string | null>(null);
	private readonly _loading = signal(false);
	private readonly _statsLoading = signal(false);
	private readonly _detailLoading = signal(false);
	private readonly _statsReady = signal(false);
	private readonly _tableReady = signal(false);
	// #endregion

	// #region Estado privado - Import
	private readonly _importDialogVisible = signal(false);
	private readonly _importLoading = signal(false);
	private readonly _importResult = signal<ImportarHorariosResult | null>(null);
	// #endregion

	// #region Lecturas públicas - Datos
	readonly horarios = this._horarios.asReadonly();
	readonly horarioDetalle = this._horarioDetalle.asReadonly();
	readonly estadisticas = this._estadisticas.asReadonly();
	// #endregion

	// #region Lecturas públicas - Loading
	readonly error = this._error.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly statsLoading = this._statsLoading.asReadonly();
	readonly detailLoading = this._detailLoading.asReadonly();
	readonly statsReady = this._statsReady.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();
	// Re-export del sub-store (consumers legacy)
	readonly optionsLoading = this.optionsStore.optionsLoading;
	// #endregion

	// #region Lecturas públicas - Import
	readonly importDialogVisible = this._importDialogVisible.asReadonly();
	readonly importLoading = this._importLoading.asReadonly();
	readonly importResult = this._importResult.asReadonly();
	// #endregion

	// #region Usuario actual
	readonly currentUser = this.authStore.user;

	readonly isAdmin = computed(() => isAdminRole(this.currentUser()?.rol));

	readonly currentProfesorId = computed(() => {
		const user = this.currentUser();
		if (!user || user.rol !== 'Profesor') return null;
		return user.entityId;
	});
	// #endregion

	// #region Computed - Options (re-export del sub-store)
	readonly salonesOptions = this.optionsStore.salonesOptions;
	readonly cursosOptions = this.optionsStore.cursosOptions;
	readonly cursosPorNivel = this.optionsStore.cursosPorNivel;
	readonly profesoresOptions = this.optionsStore.profesoresOptions;
	// #endregion

	// #region Computed - Modo de asignación
	/** Modo de asignación del salón del horario en el detail drawer. */
	readonly modoAsignacionDetalle = computed(() => {
		const detalle = this._horarioDetalle();
		if (!detalle) return null;
		return this.optionsStore.resolveModoForSalon(detalle.salonId);
	});
	// #endregion

	// #region Computed - Estadísticas derivadas
	readonly totalHorarios = computed(() => this._horarios().length);
	readonly horariosActivos = computed(() => this._horarios().filter((h) => h.estado).length);
	readonly horariosInactivos = computed(() => this._horarios().filter((h) => !h.estado).length);
	readonly horariosSinProfesor = computed(() =>
		this._horarios().filter((h) => h.profesorId === null).length,
	);
	// #endregion

	// #region Sub-ViewModels
	readonly dataVm = computed(() => ({
		horarios: this._horarios(),
		horariosFiltrados: this.filterStore.horariosFiltrados(),
		horariosSemanales: this.filterStore.horariosSemanales(),
		horarioDetalle: this._horarioDetalle(),
		estadisticas: this._estadisticas(),
		totalHorarios: this.totalHorarios(),
		horariosActivos: this.horariosActivos(),
		horariosInactivos: this.horariosInactivos(),
		horariosSinProfesor: this.horariosSinProfesor(),
		isEmpty: this._horarios().length === 0,
	}));

	readonly uiVm = computed(() => ({
		loading: this._loading(),
		error: this._error(),
		statsLoading: this._statsLoading(),
		detailLoading: this._detailLoading(),
		optionsLoading: this.optionsStore.optionsLoading(),
		statsReady: this._statsReady(),
		tableReady: this._tableReady(),
		dialogVisible: this.formStore.dialogVisible(),
		detailDrawerVisible: this.formStore.detailDrawerVisible(),
		cursoDialogVisible: this.formStore.cursoDialogVisible(),
		vistaActual: this.filterStore.vistaActual(),
		vistaSemanalHabilitada: this.filterStore.vistaSemanalHabilitada(),
		filtroDiaSemanaHabilitado: this.filterStore.filtroDiaSemanaHabilitado(),
		currentUser: this.currentUser(),
		isAdmin: this.isAdmin(),
		currentProfesorId: this.currentProfesorId(),
		importDialogVisible: this._importDialogVisible(),
		importLoading: this._importLoading(),
		importResult: this._importResult(),
		modoAsignacionDetalle: this.modoAsignacionDetalle(),
	}));

	readonly formVm = computed(() => ({
		formData: this.formStore.formData(),
		editingId: this.formStore.editingId(),
		wizardStep: this.formStore.wizardStep(),
		isCreating: this.formStore.isCreating(),
		isEditing: this.formStore.isEditing(),
		formValid: this.formStore.formValid(),
		horaInicioError: this.formStore.horaInicioError(),
		horaFinError: this.formStore.horaFinError(),
		canGoNextStep: this.formStore.canGoNextStep(),
		canGoPrevStep: this.formStore.canGoPrevStep(),
		isLastStep: this.formStore.isLastStep(),
	}));

	readonly optionsVm = computed(() => ({
		salonesOptions: this.optionsStore.salonesOptions(),
		cursosOptions: this.optionsStore.cursosOptions(),
		cursosPorNivel: this.optionsStore.cursosPorNivel(),
		profesoresOptions: this.optionsStore.profesoresOptions(),
		modoAsignacion: this.optionsStore.modoAsignacion(),
		profesoresParaAsignacion: this.optionsStore.profesoresParaAsignacion(),
		filtroSalonId: this.filterStore.filtroSalonId(),
		filtroProfesorId: this.filterStore.filtroProfesorId(),
		filtroDiaSemana: this.filterStore.filtroDiaSemana(),
		filtroEstadoActivo: this.filterStore.filtroEstadoActivo(),
		hasFilters: this.filterStore.hasFilters(),
		page: this.filterStore.page(),
		pageSize: this.filterStore.pageSize(),
		totalRecords: this.filterStore.totalRecords(),
	}));
	// #endregion

	// #region ViewModel consolidado
	readonly vm = computed(() => ({
		...this.dataVm(),
		...this.uiVm(),
		...this.formVm(),
		...this.optionsVm(),
	}));
	// #endregion

	// #region Comandos - Lista
	setHorarios(horarios: HorarioResponseDto[]): void {
		this._horarios.set(horarios);
		this.syncHorariosDownstream();
	}
	// #endregion

	// #region Comandos - Opciones (delega en optionsStore)
	setSalonesDisponibles(salones: SalonListDto[]): void {
		this.optionsStore.setSalonesDisponibles(salones);
	}

	setCursosDisponibles(cursos: CursoListaDto[]): void {
		this.optionsStore.setCursosDisponibles(cursos);
	}

	setProfesoresDisponibles(profesores: ProfesorListDto[]): void {
		this.optionsStore.setProfesoresDisponibles(profesores);
	}

	setOptionsLoading(loading: boolean): void {
		this.optionsStore.setOptionsLoading(loading);
	}

	setProfesoresCurso(profesoresCurso: ProfesorCursoListaDto[]): void {
		this.optionsStore.setProfesoresCurso(profesoresCurso);
	}

	clearProfesoresCurso(): void {
		this.optionsStore.clearProfesoresCurso();
	}

	/** Mutación quirúrgica: Actualizar un horario específico sin refetch */
	updateHorario(id: number, updates: Partial<HorarioResponseDto>): void {
		this._horarios.update((list) =>
			list.map((h) => (h.id === id ? { ...h, ...updates } : h)),
		);
		this.syncHorariosDownstream();
	}

	/** Mutación quirúrgica: Toggle estado de un horario */
	toggleHorarioEstado(id: number): void {
		this._horarios.update((list) =>
			list.map((h) => (h.id === id ? { ...h, estado: !h.estado } : h)),
		);
		this.syncHorariosDownstream();
	}

	/** Mutación quirúrgica: Eliminar un horario */
	removeHorario(id: number): void {
		this._horarios.update((list) => list.filter((h) => h.id !== id));
		this.syncHorariosDownstream();
	}

	/** Mutación quirúrgica: Re-agregar un horario (rollback de delete) */
	addHorario(horario: HorarioResponseDto): void {
		this._horarios.update((list) => [horario, ...list]);
		this.syncHorariosDownstream();
	}
	// #endregion

	// #region Comandos - Detalle
	setHorarioDetalle(detalle: HorarioDetalleResponseDto | null): void {
		this._horarioDetalle.set(detalle);
	}

	/** Mutación quirúrgica: quitar profesor del detalle local */
	clearDetalleProfesor(): void {
		this._horarioDetalle.update((detalle) => {
			if (!detalle) return detalle;
			return {
				...detalle,
				profesorId: null,
				profesorNombreCompleto: null,
				profesorDni: null,
			};
		});
	}

	/** Mutación quirúrgica: quitar un estudiante del detalle local */
	removeEstudianteFromDetalle(estudianteId: number): void {
		this._horarioDetalle.update((detalle) => {
			if (!detalle) return detalle;
			const estudiantes = detalle.estudiantes.filter((e) => e.id !== estudianteId);
			return {
				...detalle,
				estudiantes,
				cantidadEstudiantes: estudiantes.length,
			};
		});
	}
	// #endregion

	// #region Comandos - Estadísticas
	setEstadisticas(estadisticas: HorariosEstadisticas | null): void {
		this._estadisticas.set(estadisticas);
	}

	incrementarEstadistica(campo: keyof HorariosEstadisticas, delta: number): void {
		this._estadisticas.update((stats) =>
			stats ? { ...stats, [campo]: (stats[campo] || 0) + delta } : stats,
		);
	}
	// #endregion

	// #region Comandos - Error / Loading
	setError(error: string | null): void {
		this._error.set(error);
	}

	clearError(): void {
		this._error.set(null);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setStatsLoading(loading: boolean): void {
		this._statsLoading.set(loading);
	}

	setDetailLoading(loading: boolean): void {
		this._detailLoading.set(loading);
	}

	setStatsReady(ready: boolean): void {
		this._statsReady.set(ready);
	}

	setTableReady(ready: boolean): void {
		this._tableReady.set(ready);
	}
	// #endregion

	// #region Comandos - Detail drawer
	closeDetailDrawer(): void {
		this.formStore.closeDetailDrawer();
		this._horarioDetalle.set(null);
	}
	// #endregion

	// #region Comandos - Import
	openImportDialog(): void {
		this._importDialogVisible.set(true);
		this._importResult.set(null);
	}

	closeImportDialog(): void {
		this._importDialogVisible.set(false);
		this._importResult.set(null);
	}

	setImportLoading(loading: boolean): void {
		this._importLoading.set(loading);
	}

	setImportResult(result: ImportarHorariosResult | null): void {
		this._importResult.set(result);
	}
	// #endregion

	// #region Helpers privados
	/** Sincroniza horarios hacia filterStore (filtros) y optionsStore (conflictos) */
	private syncHorariosDownstream(): void {
		this.filterStore.setHorariosSource(this._horarios());
		this.optionsStore.setHorariosSource(this._horarios());
	}
	// #endregion
}
