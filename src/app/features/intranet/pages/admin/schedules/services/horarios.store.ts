import { computed, inject, Injectable, signal } from '@angular/core';

import { AuthStore } from '@core/store';
import { isAdminRole } from '@shared/models';
import { CursoListaDto, CursoOption, CursosPorNivel } from '../models/curso.interface';
import { filterSalonesDisponibles } from '../helpers/horario-conflict.utils';
import { type ImportarHorariosResult } from '../helpers/horario-import.config';
import { mapSalonesToOptions, mapCursosToOptions, groupCursosByNivel, mapProfesToOptions } from '../helpers/horario-mapping.utils';
import {
	type HorarioDetalleResponseDto,
	type HorarioResponseDto,
	type HorariosEstadisticas,
} from '../models/horario.interface';
import { ProfesorListDto, ProfesorOption } from '../models/profesor.interface';
import { SalonListDto, SalonOption } from '../models/salon.interface';
import { SchedulesFormStore } from './horarios-form.store';
import { SchedulesFilterStore } from './horarios-filter.store';

@Injectable({ providedIn: 'root' })
export class SchedulesStore {
	private authStore = inject(AuthStore);
	readonly formStore = inject(SchedulesFormStore);
	readonly filterStore = inject(SchedulesFilterStore);

	// #region Estado privado - Datos
	private readonly _horarios = signal<HorarioResponseDto[]>([]);
	private readonly _horarioDetalle = signal<HorarioDetalleResponseDto | null>(null);
	private readonly _estadisticas = signal<HorariosEstadisticas | null>(null);
	// #endregion

	// #region Estado privado - Opciones para dropdowns
	private readonly _salonesDisponibles = signal<SalonListDto[]>([]);
	private readonly _cursosDisponibles = signal<CursoListaDto[]>([]);
	private readonly _profesoresDisponibles = signal<ProfesorListDto[]>([]);
	// #endregion

	// #region Estado privado - Loading
	private readonly _error = signal<string | null>(null);
	private readonly _loading = signal(false);
	private readonly _statsLoading = signal(false);
	private readonly _detailLoading = signal(false);
	private readonly _optionsLoading = signal(false);
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
	readonly optionsLoading = this._optionsLoading.asReadonly();
	readonly statsReady = this._statsReady.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();
	// #endregion

	// #region Lecturas públicas - Import
	readonly importDialogVisible = this._importDialogVisible.asReadonly();
	readonly importLoading = this._importLoading.asReadonly();
	readonly importResult = this._importResult.asReadonly();
	// #endregion

	// Sub-stores expuestos directamente — facades acceden a formStore/filterStore sin delegación
	// #endregion

	// #region Usuario actual
	readonly currentUser = this.authStore.user;

	/** true si el usuario es Director o Asistente Administrativo */
	readonly isAdmin = computed(() => isAdminRole(this.currentUser()?.rol));

	/** ID del profesor logueado (null si no es profesor) */
	readonly currentProfesorId = computed(() => {
		const user = this.currentUser();
		if (!user || user.rol !== 'Profesor') return null;
		return user.entityId;
	});
	// #endregion

	// #region Computed - Opciones de dropdowns (memoización intermedia)

	/** Salones activos: solo depende de salonesDisponibles, no de formData/horarios */
	private readonly activeSalones = computed(() =>
		this._salonesDisponibles().filter((s) => s.estado),
	);

	/** Mapeo de salones activos a opciones de dropdown (memoizado) */
	private readonly activeSalonesAsOptions = computed<SalonOption[]>(() =>
		mapSalonesToOptions(this.activeSalones()),
	);

	/**
	 * Opciones de salones disponibles (sin conflicto de horario).
	 * Si no hay día/hora seleccionados, devuelve todos los activos (memoizado).
	 * Si hay día/hora, filtra por conflicto de horario.
	 */
	readonly salonesOptions = computed<SalonOption[]>(() => {
		const formData = this.formStore.formData();

		// Sin día/hora -> devolver opciones activas ya memoizadas
		if (!formData.diaSemana || !formData.horaInicio || !formData.horaFin) {
			return this.activeSalonesAsOptions();
		}

		// Con día/hora -> filtrar por conflicto y mapear
		const disponibles = filterSalonesDisponibles(
			this.activeSalones(),
			this._horarios(),
			formData,
			this.formStore.editingId(),
		);

		return mapSalonesToOptions(disponibles);
	});

	/** Cursos activos: solo depende de cursosDisponibles */
	private readonly activeCursos = computed(() =>
		this._cursosDisponibles().filter((c) => c.estado),
	);

	/** Opciones de cursos disponibles (activos) con niveles educativos */
	readonly cursosOptions = computed<CursoOption[]>(() =>
		mapCursosToOptions(this.activeCursos()),
	);

	/** Cursos agrupados por nivel educativo (Inicial, Primaria, Secundaria) */
	readonly cursosPorNivel = computed<CursosPorNivel>(() =>
		groupCursosByNivel(this.cursosOptions()),
	);

	/** Profesores activos: solo depende de profesoresDisponibles */
	private readonly activeProfesores = computed(() =>
		this._profesoresDisponibles().filter((p) => p.estado),
	);

	/** Opciones de profesores disponibles (activos) */
	readonly profesoresOptions = computed<ProfesorOption[]>(() =>
		mapProfesToOptions(this.activeProfesores()),
	);
	// #endregion

	// #region Computed - Estadísticas derivadas
	readonly totalHorarios = computed(() => this._horarios().length);
	readonly horariosActivos = computed(() => this._horarios().filter((h) => h.estado).length);
	readonly horariosInactivos = computed(() => this._horarios().filter((h) => !h.estado).length);
	readonly horariosSinProfesor = computed(() =>
		this._horarios().filter((h) => h.profesorId === null).length,
	);
	// #endregion

	// #region Sub-ViewModels (agrupados por responsabilidad)

	/** Datos de la tabla y detalle */
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

	/** Estado de UI: loading, dialogs, vista, filtros */
	readonly uiVm = computed(() => ({
		loading: this._loading(),
		error: this._error(),
		statsLoading: this._statsLoading(),
		detailLoading: this._detailLoading(),
		optionsLoading: this._optionsLoading(),
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
	}));

	/** Formulario wizard */
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

	/** Opciones para dropdowns y filtros */
	readonly optionsVm = computed(() => ({
		salonesOptions: this.salonesOptions(),
		cursosOptions: this.cursosOptions(),
		cursosPorNivel: this.cursosPorNivel(),
		profesoresOptions: this.profesoresOptions(),
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

	// #region ViewModel consolidado (compone sub-VMs)
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
		this.syncHorariosToFilter();
	}
	// #endregion

	// #region Comandos - Opciones
	setSalonesDisponibles(salones: SalonListDto[]): void {
		this._salonesDisponibles.set(salones);
	}

	setCursosDisponibles(cursos: CursoListaDto[]): void {
		this._cursosDisponibles.set(cursos);
	}

	setProfesoresDisponibles(profesores: ProfesorListDto[]): void {
		this._profesoresDisponibles.set(profesores);
	}

	setOptionsLoading(loading: boolean): void {
		this._optionsLoading.set(loading);
	}

	/** Mutación quirúrgica: Actualizar un horario específico sin refetch */
	updateHorario(id: number, updates: Partial<HorarioResponseDto>): void {
		this._horarios.update((list) =>
			list.map((h) => (h.id === id ? { ...h, ...updates } : h)),
		);
		this.syncHorariosToFilter();
	}

	/** Mutación quirúrgica: Toggle estado de un horario */
	toggleHorarioEstado(id: number): void {
		this._horarios.update((list) =>
			list.map((h) => (h.id === id ? { ...h, estado: !h.estado } : h)),
		);
		this.syncHorariosToFilter();
	}

	/** Mutación quirúrgica: Eliminar un horario */
	removeHorario(id: number): void {
		this._horarios.update((list) => list.filter((h) => h.id !== id));
		this.syncHorariosToFilter();
	}

	/** Mutación quirúrgica: Re-agregar un horario (rollback de delete) */
	addHorario(horario: HorarioResponseDto): void {
		this._horarios.update((list) => [horario, ...list]);
		this.syncHorariosToFilter();
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
		this._estadisticas.update((stats) => stats ? { ...stats, [campo]: (stats[campo] || 0) + delta } : stats);
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

	// #region Comandos - Detail drawer (tiene side effect en horarioDetalle)
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
	/** Sincroniza la fuente de horarios hacia el filterStore para que recalcule sus computed */
	private syncHorariosToFilter(): void {
		this.filterStore.setHorariosSource(this._horarios());
	}
	// #endregion
}
