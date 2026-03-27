import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import {
	UI_SUMMARIES,
	UI_SALONES_SUCCESS_MESSAGES,
	UI_SALONES_ERROR_DETAILS,
	UI_SALONES_CONFIRM_HEADERS,
	UI_ADMIN_ERROR_DETAILS,
} from '@shared/constants';

import { SalonesAdminApiService } from './salones-admin-api.service';
import { SalonesAdminStore } from './salones-admin.store';
import {
	NivelEducativo,
	CrearConfiguracionCalificacionDto,
	ActualizarConfiguracionCalificacionDto,
	AprobarEstudianteDto,
	AprobacionMasivaDto,
	CrearPeriodoAcademicoDto,
} from '../models';

@Injectable({ providedIn: 'root' })
export class SalonesAdminFacade {
	// #region Dependencias
	private api = inject(SalonesAdminApiService);
	private store = inject(SalonesAdminStore);
	private errorHandler = inject(ErrorHandlerService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos de carga

	/** Carga inicial: salones + periodos + configuraciones en paralelo */
	loadAll(): void {
		this.store.setLoading(true);
		this.store.setTableReady(false);
		this.store.setStatsReady(false);
		this.store.setError(null);

		const anio = this.store.filtroAnio();
		const esVerano = this.store.esVerano();

		forkJoin({
			salones: this.api.getSalonesAdmin(anio, esVerano),
			periodos: this.api.getPeriodosPorAnio(anio),
			configuraciones: this.api.getConfiguracionesPorAnio(anio),
		})
			.pipe(
				withRetry({ tag: 'SalonesAdminFacade:loadAll' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: ({ salones, periodos, configuraciones }) => {
					this.store.setSalones(salones);
					this.store.setPeriodos(periodos);
					this.store.setConfiguraciones(configuraciones);
					this.store.setStatsReady(true);
					this.store.setTableReady(true);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar datos de salones admin:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.loadHorariosData);
					this.store.setError(UI_ADMIN_ERROR_DETAILS.loadHorariosData);
					this.store.setLoading(false);
				},
			});
	}

	/** Recarga solo salones (después de operaciones) */
	refreshSalones(): void {
		this.store.setLoading(true);
		const anio = this.store.filtroAnio();
		const esVerano = this.store.esVerano();

		this.api
			.getSalonesAdmin(anio, esVerano)
			.pipe(
				withRetry({ tag: 'SalonesAdminFacade:refreshSalones' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (salones) => {
					this.store.setSalones(salones);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al refrescar salones:', err);
					this.store.setLoading(false);
				},
			});
	}
	// #endregion

	// #region Comandos de configuración

	crearConfiguracion(dto: CrearConfiguracionCalificacionDto): void {
		this.store.setLoading(true);

		this.api
			.crearConfiguracion(dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (ok) => {
					if (ok) {
						this.errorHandler.showSuccess(UI_SALONES_CONFIRM_HEADERS.configCreated, UI_SALONES_SUCCESS_MESSAGES.configCreated);
						this.store.closeConfigDialog();
						this.refreshConfiguraciones();
					} else {
						this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.createConfig);
					}
					this.store.setLoading(false);
				},
				error: () => {
					this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.createConfig);
					this.store.setLoading(false);
				},
			});
	}

	actualizarConfiguracion(id: number, dto: ActualizarConfiguracionCalificacionDto): void {
		this.store.setLoading(true);

		this.api
			.actualizarConfiguracion(id, dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (ok) => {
					if (ok) {
						this.errorHandler.showSuccess(UI_SALONES_CONFIRM_HEADERS.configUpdated, UI_SALONES_SUCCESS_MESSAGES.configUpdated);
						this.store.closeConfigDialog();
						this.refreshConfiguraciones();
					} else {
						this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.updateConfig);
					}
					this.store.setLoading(false);
				},
				error: () => {
					this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.updateConfig);
					this.store.setLoading(false);
				},
			});
	}

	private refreshConfiguraciones(): void {
		const anio = this.store.filtroAnio();
		this.api
			.getConfiguracionesPorAnio(anio)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((configs) => this.store.setConfiguraciones(configs));
	}
	// #endregion

	// #region Comandos de periodo

	crearPeriodo(dto: CrearPeriodoAcademicoDto): void {
		this.store.setLoading(true);

		this.api
			.crearPeriodo(dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (ok) => {
					if (ok) {
						this.errorHandler.showSuccess(UI_SALONES_CONFIRM_HEADERS.periodoCreated, UI_SALONES_SUCCESS_MESSAGES.periodoCreated(dto.nivel));
						this.refreshPeriodos();
					} else {
						this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.createPeriodo);
					}
					this.store.setLoading(false);
				},
				error: () => {
					this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.createPeriodo);
					this.store.setLoading(false);
				},
			});
	}

	cerrarPeriodo(periodoId: number): void {
		this.store.setLoading(true);

		this.api
			.cerrarPeriodo(periodoId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (resultado) => {
					if (resultado) {
						this.errorHandler.showSuccess(UI_SALONES_SUCCESS_MESSAGES.periodoClosed, `Se crearon ${resultado.salonesCreados} salones para el próximo año. ${resultado.estudiantesPendientes} estudiantes pendientes de aprobación.`, 8000);
						this.store.closeCerrarPeriodoDialog();
						this.loadAll();
					} else {
						this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.closePeriodo);
					}
					this.store.setLoading(false);
				},
				error: () => {
					this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.closePeriodo);
					this.store.setLoading(false);
				},
			});
	}

	private refreshPeriodos(): void {
		const anio = this.store.filtroAnio();
		this.api
			.getPeriodosPorAnio(anio)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((periodos) => this.store.setPeriodos(periodos));
	}
	// #endregion

	// #region Comandos de aprobación

	loadAprobaciones(salonId: number): void {
		this.store.setAprobacionesLoading(true);

		this.api
			.getEstudiantesPorSalon(salonId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (estudiantes) => {
					this.store.setAprobaciones(estudiantes);
					this.store.setAprobacionesLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar estudiantes del salón:', err);
					this.store.setAprobacionesLoading(false);
				},
			});
	}

	aprobarEstudiante(dto: AprobarEstudianteDto): void {
		this.api
			.aprobarEstudiante(dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (ok) => {
					if (ok) {
						this.store.updateAprobacion(dto.estudianteId, {
							estado: dto.estado,
							esVacacional: dto.esVacacional,
							promedioFinal: dto.promedioFinal,
							observacion: dto.observacion,
						});
						this.refreshSalones();
					} else {
						this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.aprobarEstudiante);
					}
				},
				error: () => {
					this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.aprobarEstudiante);
				},
			});
	}

	aprobarMasivo(dto: AprobacionMasivaDto): void {
		this.store.setAprobacionesLoading(true);

		this.api
			.aprobarMasivo(dto)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (resultado) => {
					if (resultado) {
						const detail = resultado.failed > 0
							? `${resultado.succeeded} exitosos, ${resultado.failed} fallidos de ${resultado.total}`
							: `${resultado.succeeded} de ${resultado.total} procesados correctamente`;
						this.errorHandler.showSuccess(UI_SALONES_CONFIRM_HEADERS.aprobacionMasiva, detail, 5000);
						const salonId = this.store.selectedSalonId();
						if (salonId) this.loadAprobaciones(salonId);
						this.refreshSalones();
					} else {
						this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.aprobarMasivo);
					}
					this.store.setAprobacionesLoading(false);
				},
				error: () => {
					this.errorHandler.showError(UI_SUMMARIES.error, UI_SALONES_ERROR_DETAILS.aprobarMasivo);
					this.store.setAprobacionesLoading(false);
				},
			});
	}
	// #endregion

	// #region Comandos de salon detail

	loadHorariosSalon(salonId: number): void {
		this.store.setHorariosLoading(true);

		this.api
			.getHorariosPorSalon(salonId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (horarios) => {
					this.store.setSalonHorarios(horarios);
					this.store.setHorariosLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar horarios del salón:', err);
					this.store.setHorariosLoading(false);
				},
			});
	}

	loadAsistenciaSalon(grado: string, seccion: string, mes: number, anio: number): void {
		this.store.setAsistenciaLoading(true);

		this.api
			.getAsistenciaMensual(grado, seccion, mes, anio)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (asistencia) => {
					this.store.setSalonAsistencia(asistencia);
					this.store.setAsistenciaLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar asistencia del salón:', err);
					this.store.setAsistenciaLoading(false);
				},
			});
	}

	loadNotasSalon(salonId: number, cursoId: number): void {
		this.store.setNotasLoading(true);

		this.api
			.getNotasSalon(salonId, cursoId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (notas) => {
					this.store.setSalonNotas(notas);
					this.store.setNotasLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar notas del salón:', err);
					this.store.setNotasLoading(false);
				},
			});
	}
	// #endregion

	// #region Comandos de UI

	setNivel(nivel: NivelEducativo): void {
		this.store.setSelectedNivel(nivel);
	}

	setAnio(anio: number): void {
		this.store.setFiltroAnio(anio);
		this.loadAll();
	}

	setEsVerano(esVerano: boolean): void {
		this.store.setEsVerano(esVerano);
		this.loadAll();
	}

	openConfigDialog(): void {
		this.store.openConfigDialog();
	}

	closeConfigDialog(): void {
		this.store.closeConfigDialog();
	}

	openCerrarPeriodoDialog(): void {
		this.store.openCerrarPeriodoDialog();
	}

	closeCerrarPeriodoDialog(): void {
		this.store.closeCerrarPeriodoDialog();
	}

	openSalonDialog(salonId: number): void {
		this.store.openSalonDialog(salonId);
		this.loadAprobaciones(salonId);
		this.loadHorariosSalon(salonId);
	}

	closeSalonDialog(): void {
		this.store.closeSalonDialog();
	}

	openConfirmDialog(): void {
		this.store.openConfirmDialog();
	}

	closeConfirmDialog(): void {
		this.store.closeConfirmDialog();
	}
	// #endregion
}
