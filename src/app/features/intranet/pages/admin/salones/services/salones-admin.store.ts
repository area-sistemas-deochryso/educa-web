import { Injectable, signal, computed } from '@angular/core';

import { determinarNivelPorOrden } from '@core/helpers';
import { periodoActual, esVerano } from '@shared/models';
import { EstudianteAsistencia } from '@shared/services/asistencia';
import { HorarioResponseDto, SalonNotasResumenDto } from '@data/models';

import {
	NivelEducativo,
	SalonAdminListDto,
	PeriodoAcademicoListDto,
	ConfiguracionCalificacionListDto,
	AprobacionEstudianteListDto,
	SalonesAdminEstadisticas,
} from '../models';

@Injectable({ providedIn: 'root' })
export class SalonesAdminStore {
	// #region Estado privado — datos principales
	private readonly _salones = signal<SalonAdminListDto[]>([]);
	private readonly _periodos = signal<PeriodoAcademicoListDto[]>([]);
	private readonly _configuraciones = signal<ConfiguracionCalificacionListDto[]>([]);
	private readonly _aprobaciones = signal<AprobacionEstudianteListDto[]>([]);
	// #endregion

	// #region Estado privado — salon detail
	private readonly _salonHorarios = signal<HorarioResponseDto[]>([]);
	private readonly _salonAsistencia = signal<EstudianteAsistencia[]>([]);
	private readonly _salonNotas = signal<SalonNotasResumenDto | null>(null);
	private readonly _horariosLoading = signal(false);
	private readonly _asistenciaLoading = signal(false);
	private readonly _notasLoading = signal(false);
	// #endregion

	// #region Estado privado — UI
	private readonly _loading = signal(false);
	private readonly _tableReady = signal(false);
	private readonly _statsReady = signal(false);
	private readonly _aprobacionesLoading = signal(false);
	private readonly _error = signal<string | null>(null);

	private readonly _selectedNivel = signal<NivelEducativo>('Inicial');
	private readonly _filtroAnio = signal(new Date().getFullYear());
	private readonly _esVerano = signal(esVerano(periodoActual()));
	private readonly _selectedSalonId = signal<number | null>(null);

	private readonly _configDialogVisible = signal(false);
	private readonly _cerrarPeriodoDialogVisible = signal(false);
	private readonly _salonDialogVisible = signal(false);
	private readonly _confirmDialogVisible = signal(false);
	// #endregion

	// #region Lecturas públicas (readonly)
	readonly salones = this._salones.asReadonly();
	readonly periodos = this._periodos.asReadonly();
	readonly configuraciones = this._configuraciones.asReadonly();
	readonly aprobaciones = this._aprobaciones.asReadonly();

	readonly salonHorarios = this._salonHorarios.asReadonly();
	readonly salonAsistencia = this._salonAsistencia.asReadonly();
	readonly salonNotas = this._salonNotas.asReadonly();
	readonly horariosLoading = this._horariosLoading.asReadonly();
	readonly asistenciaLoading = this._asistenciaLoading.asReadonly();
	readonly notasLoading = this._notasLoading.asReadonly();

	readonly loading = this._loading.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();
	readonly statsReady = this._statsReady.asReadonly();
	readonly aprobacionesLoading = this._aprobacionesLoading.asReadonly();
	readonly error = this._error.asReadonly();

	readonly selectedNivel = this._selectedNivel.asReadonly();
	readonly filtroAnio = this._filtroAnio.asReadonly();
	readonly esVerano = this._esVerano.asReadonly();
	readonly selectedSalonId = this._selectedSalonId.asReadonly();

	readonly configDialogVisible = this._configDialogVisible.asReadonly();
	readonly cerrarPeriodoDialogVisible = this._cerrarPeriodoDialogVisible.asReadonly();
	readonly salonDialogVisible = this._salonDialogVisible.asReadonly();
	readonly confirmDialogVisible = this._confirmDialogVisible.asReadonly();
	// #endregion

	// #region Computed — filtrado por nivel
	readonly salonesFiltrados = computed(() =>
		this._salones().filter((s) => determinarNivelPorOrden(s.gradoOrden) === this._selectedNivel()),
	);

	readonly periodoActual = computed(() => {
		const nivel = this._selectedNivel();
		const anio = this._filtroAnio();
		return this._periodos().find((p) => p.nivel === nivel && p.anio === anio) ?? null;
	});

	readonly configActual = computed(() => {
		const nivel = this._selectedNivel();
		const anio = this._filtroAnio();
		return this._configuraciones().find((c) => c.nivel === nivel && c.anio === anio) ?? null;
	});

	readonly selectedSalon = computed(() => {
		const id = this._selectedSalonId();
		return id ? this._salones().find((s) => s.id === id) ?? null : null;
	});
	// #endregion

	// #region Computed — estadísticas por nivel
	readonly estadisticas = computed<SalonesAdminEstadisticas>(() => {
		const salones = this.salonesFiltrados();
		return {
			totalSalones: salones.length,
			totalEstudiantes: salones.reduce((sum, s) => sum + s.totalEstudiantes, 0),
			totalAprobados: salones.reduce((sum, s) => sum + s.aprobados, 0),
			totalDesaprobados: salones.reduce((sum, s) => sum + s.desaprobados, 0),
			totalPendientes: salones.reduce((sum, s) => sum + s.pendientes, 0),
		};
	});

	readonly periodoCerrado = computed(() => this.periodoActual()?.estadoCierre === 'CERRADO');
	// #endregion

	// #region Sub-ViewModels
	readonly dataVm = computed(() => ({
		salones: this.salonesFiltrados(),
		periodos: this._periodos(),
		configuraciones: this._configuraciones(),
		aprobaciones: this._aprobaciones(),
		estadisticas: this.estadisticas(),
		periodoActual: this.periodoActual(),
		configActual: this.configActual(),
		periodoCerrado: this.periodoCerrado(),
	}));

	readonly uiVm = computed(() => ({
		loading: this._loading(),
		tableReady: this._tableReady(),
		statsReady: this._statsReady(),
		aprobacionesLoading: this._aprobacionesLoading(),
		error: this._error(),
		selectedNivel: this._selectedNivel(),
		filtroAnio: this._filtroAnio(),
		esVerano: this._esVerano(),
		selectedSalonId: this._selectedSalonId(),
		selectedSalon: this.selectedSalon(),
		configDialogVisible: this._configDialogVisible(),
		cerrarPeriodoDialogVisible: this._cerrarPeriodoDialogVisible(),
		salonDialogVisible: this._salonDialogVisible(),
		confirmDialogVisible: this._confirmDialogVisible(),
	}));

	readonly salonDetailVm = computed(() => ({
		salonHorarios: this._salonHorarios(),
		salonAsistencia: this._salonAsistencia(),
		salonNotas: this._salonNotas(),
		horariosLoading: this._horariosLoading(),
		asistenciaLoading: this._asistenciaLoading(),
		notasLoading: this._notasLoading(),
	}));
	// #endregion

	// #region ViewModel consolidado
	readonly vm = computed(() => ({
		...this.dataVm(),
		...this.uiVm(),
		...this.salonDetailVm(),
	}));
	// #endregion

	// #region Comandos de datos
	setSalones(salones: SalonAdminListDto[]): void {
		this._salones.set(salones);
	}

	setPeriodos(periodos: PeriodoAcademicoListDto[]): void {
		this._periodos.set(periodos);
	}

	setConfiguraciones(configs: ConfiguracionCalificacionListDto[]): void {
		this._configuraciones.set(configs);
	}

	setAprobaciones(aprobaciones: AprobacionEstudianteListDto[]): void {
		this._aprobaciones.set(aprobaciones);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setTableReady(ready: boolean): void {
		this._tableReady.set(ready);
	}

	setStatsReady(ready: boolean): void {
		this._statsReady.set(ready);
	}

	setAprobacionesLoading(loading: boolean): void {
		this._aprobacionesLoading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	/** Mutación quirúrgica: actualizar aprobación de 1 estudiante */
	updateAprobacion(estudianteId: number, updates: Partial<AprobacionEstudianteListDto>): void {
		this._aprobaciones.update((list) =>
			list.map((a) => (a.estudianteId === estudianteId ? { ...a, ...updates } : a)),
		);
	}
	// #endregion

	// #region Comandos de datos — salon detail
	setSalonHorarios(horarios: HorarioResponseDto[]): void {
		this._salonHorarios.set(horarios);
	}

	setHorariosLoading(loading: boolean): void {
		this._horariosLoading.set(loading);
	}

	setSalonAsistencia(asistencia: EstudianteAsistencia[]): void {
		this._salonAsistencia.set(asistencia);
	}

	setAsistenciaLoading(loading: boolean): void {
		this._asistenciaLoading.set(loading);
	}

	setSalonNotas(notas: SalonNotasResumenDto | null): void {
		this._salonNotas.set(notas);
	}

	setNotasLoading(loading: boolean): void {
		this._notasLoading.set(loading);
	}
	// #endregion

	// #region Comandos de UI — Filtros
	setSelectedNivel(nivel: NivelEducativo): void {
		this._selectedNivel.set(nivel);
	}

	setFiltroAnio(anio: number): void {
		this._filtroAnio.set(anio);
	}

	setEsVerano(esVerano: boolean): void {
		this._esVerano.set(esVerano);
	}

	setSelectedSalonId(id: number | null): void {
		this._selectedSalonId.set(id);
	}
	// #endregion

	// #region Comandos de UI — Diálogos
	openConfigDialog(): void {
		this._configDialogVisible.set(true);
	}

	closeConfigDialog(): void {
		this._configDialogVisible.set(false);
	}

	openCerrarPeriodoDialog(): void {
		this._cerrarPeriodoDialogVisible.set(true);
	}

	closeCerrarPeriodoDialog(): void {
		this._cerrarPeriodoDialogVisible.set(false);
	}

	openSalonDialog(salonId: number): void {
		this._selectedSalonId.set(salonId);
		this._salonDialogVisible.set(true);
	}

	closeSalonDialog(): void {
		this._salonDialogVisible.set(false);
		this._selectedSalonId.set(null);
		this._aprobaciones.set([]);
		this._salonHorarios.set([]);
		this._salonAsistencia.set([]);
		this._salonNotas.set(null);
	}

	openConfirmDialog(): void {
		this._confirmDialogVisible.set(true);
	}

	closeConfirmDialog(): void {
		this._confirmDialogVisible.set(false);
	}
	// #endregion
}
