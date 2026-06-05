import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper, WalCrossTabRefetchService } from '@core/services';
import { environment } from '@config';

import { TeacherFinalClassroomsApiService } from './profesor-final-salones-api.service';
import { TeacherFinalClassroomsStore } from './profesor-final-salones.store';
import { NivelEducativo, AprobarEstudianteDto, AprobacionMasivaDto } from '../models';

@Injectable({ providedIn: 'root' })
export class TeacherFinalClassroomsFacade {
	// #region Dependencias
	private api = inject(TeacherFinalClassroomsApiService);
	private store = inject(TeacherFinalClassroomsStore);
	private errorHandler = inject(ErrorHandlerService);
	private destroyRef = inject(DestroyRef);
	private wal = inject(WalFacadeHelper);
	private crossTabRefetch = inject(WalCrossTabRefetchService);
	private readonly apiUrl = `${environment.apiUrl}/api/AprobacionEstudiante`;
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	constructor() {
		this.crossTabRefetch.subscribe({
			resourceType: 'aprobacionEstudiante',
			refetchItems: () => this.loadAll(),
			destroyRef: this.destroyRef,
		});
	}

	// #region Comandos de carga

	/** Carga inicial: salones del profesor + periodos + configuraciones */
	loadAll(): void {
		this.store.setLoading(true);
		this.store.setTableReady(false);
		this.store.setStatsReady(false);
		this.store.setError(null);

		const anio = this.store.filtroAnio();

		forkJoin({
			salones: this.api.getSalonesProfesor(anio),
			periodos: this.api.getPeriodosPorAnio(anio),
			configuraciones: this.api.getConfiguracionesPorAnio(anio),
		})
			.pipe(
				withRetry({ tag: 'TeacherFinalClassroomsFacade:loadAll' }),
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

					// Auto-seleccionar el primer nivel disponible
					const niveles = this.store.nivelesDisponibles;
					if (niveles().length > 0 && !niveles().includes(this.store.selectedNivel())) {
						this.store.setSelectedNivel(niveles()[0]);
					}
				},
				error: (err) => {
					logger.error('Error al cargar salones del profesor:', err);
					this.errorHandler.showError('Error', 'No se pudieron cargar los datos');
					this.store.setError('No se pudieron cargar los datos');
					this.store.setLoading(false);
				},
			});
	}

	/** Recarga solo salones (después de operaciones) */
	refreshSalones(): void {
		this.store.setLoading(true);
		const anio = this.store.filtroAnio();

		this.api
			.getSalonesProfesor(anio)
			.pipe(
				withRetry({ tag: 'TeacherFinalClassroomsFacade:refreshSalones' }),
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

	// #region Comandos de aprobación

	loadAprobaciones(salonId: number): void {
		this.store.setAprobacionesLoading(true);
		const periodoId = this.store.periodoActual()?.id;

		this.api
			.getEstudiantesPorSalon(salonId, periodoId ?? undefined)
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
		this.wal.execute<boolean>({
			operation: 'UPDATE',
			resourceType: 'aprobacionEstudiante',
			resourceId: dto.estudianteId,
			endpoint: this.apiUrl,
			method: 'POST',
			payload: dto,
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.aprobarEstudiante(dto),
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
			onCommit: (ok) => {
				if (ok) {
					this.store.updateAprobacion(dto.estudianteId, {
						estado: dto.estado,
						esVacacional: dto.esVacacional,
						promedioFinal: dto.promedioFinal,
						observacion: dto.observacion,
					});
					this.refreshSalones();
				} else {
					this.errorHandler.showError('Error', 'No se pudo aprobar/desaprobar al estudiante');
				}
			},
			onError: () => {
				this.errorHandler.showError('Error', 'No se pudo aprobar/desaprobar al estudiante');
			},
		});
	}

	aprobarMasivo(dto: AprobacionMasivaDto): void {
		this.store.setAprobacionesLoading(true);

		this.wal.execute({
			operation: 'CREATE',
			resourceType: 'aprobacionEstudiante',
			endpoint: `${this.apiUrl}/masivo`,
			method: 'POST',
			payload: dto,
			consistencyLevel: 'server-confirmed',
			http$: () => this.api.aprobarMasivo(dto),
			optimistic: {
				apply: () => {},
				rollback: () => {},
			},
			onCommit: (resultado) => {
				if (resultado) {
					const detail = resultado.failed > 0
						? `${resultado.succeeded} exitosos, ${resultado.failed} fallidos de ${resultado.total}`
						: `${resultado.succeeded} de ${resultado.total} procesados correctamente`;
					this.errorHandler.showSuccess('Aprobación masiva completada', detail, 5000);
					const salonId = this.store.selectedSalonId();
					if (salonId) this.loadAprobaciones(salonId);
					this.refreshSalones();
				} else {
					this.errorHandler.showError('Error', 'No se pudo completar la aprobación masiva');
				}
				this.store.setAprobacionesLoading(false);
			},
			onError: () => {
				this.errorHandler.showError('Error', 'No se pudo completar la aprobación masiva');
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
