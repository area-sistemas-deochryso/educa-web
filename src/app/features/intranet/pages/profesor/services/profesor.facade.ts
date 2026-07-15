import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin } from 'rxjs';
import { logger, resolveErrorMessage, withRetry, downloadBlob } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper, WalCrossTabRefetchService } from '@core/services';
import { environment } from '@config';
import { SmartNotificationService } from '@core/services/notifications';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';
import { UserProfileService } from '@core/services/user';
import { CursoContenidoDetalleDto, VistaPromedio, ProfesorSalonConEstudiantes } from '../models';
import { ProfesorApiService } from './profesor-api.service';
import { ProfesorStore } from './profesor.store';

@Injectable({ providedIn: 'root' })
export class ProfesorFacade {
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(ProfesorStore);
	private readonly userProfile = inject(UserProfileService);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly smartNotif = inject(SmartNotificationService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly wal = inject(WalFacadeHelper);
	private readonly crossTabRefetch = inject(WalCrossTabRefetchService);
	private readonly calificacionUrl = `${environment.apiUrl}/api/Calificacion`;

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	constructor() {
		this.crossTabRefetch.subscribe({
			resourceType: 'calificacionSalon',
			refetchItems: () => {
				const salonId = this.store.selectedSalon()?.salonId;
				const cursoId = this.store.notasCursoId();
				if (salonId && cursoId) this.loadNotasSalon(salonId, cursoId);
			},
			destroyRef: this.destroyRef,
		});
	}

	// #region Comandos
	loadData(): void {
		const profesorId = this.userProfile.entityId();
		if (!profesorId) {
			logger.warn('ProfesorFacade: No se encontró entityId del profesor');
			return;
		}

		this.store.setLoading(true);
		this.store.clearError();

		forkJoin({
			horarios: this.api.getHorarios(profesorId),
			salonTutoria: this.api.getSalonTutoria(profesorId),
			misEstudiantes: this.api.getMisEstudiantes(),
		})
			.pipe(
				withRetry({ tag: 'ProfesorFacade:loadData' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: ({ horarios, salonTutoria, misEstudiantes }) => {
					this.store.setHorarios(horarios);
					this.store.setSalonTutoria(salonTutoria);
					this.store.setMisEstudiantes(misEstudiantes);
					this.store.setLoading(false);
					this.smartNotif.saveHorarioSnapshot(horarios);
				},
				error: (err) => {
					logger.error('ProfesorFacade: Error al cargar datos', err);
					const message = resolveErrorMessage(err, UI_ADMIN_ERROR_DETAILS.loadProfesorData);
					this.errorHandler.showError(UI_SUMMARIES.error, message);
					this.store.setError(message);
					this.store.setLoading(false);
				},
			});
	}

	// #endregion
	// #region Dialog commands

	/**
	 * Abre el dialog y carga estudiantes on-demand via estudiantes-salon/{salonId}.
	 * Muestra loading mientras se obtienen los datos reales del salón.
	 */
	openSalonDialog(salon: ProfesorSalonConEstudiantes): void {
		if (this.store.salonDialogLoading()) return;
		this.store.openSalonDialog(salon);

		this.api
			.getEstudiantesSalon(salon.salonId)
			.pipe(
				withRetry({ tag: 'ProfesorFacade:openSalonDialog' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (result) => {
					if (result) {
						this.store.setSelectedSalonEstudiantes({
							...salon,
							cantidadEstudiantes: result.cantidadEstudiantes,
							estudiantes: result.estudiantes,
						});
					} else {
						this.store.setSalonDialogLoading(false);
					}
				},
				error: (err) => {
					logger.error('ProfesorFacade: Error al cargar estudiantes del salón', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						resolveErrorMessage(err, UI_ADMIN_ERROR_DETAILS.loadEstudiantesSalon),
					);
					this.store.setSalonDialogLoading(false);
				},
			});
	}

	closeSalonDialog(): void {
		this.store.closeSalonDialog();
	}

	// #endregion
	// #region Notas salón commands
	loadNotasSalon(salonId: number, cursoId: number): void {
		if (this.store.notasSalonLoading()) return;
		this.store.setNotasSalonLoading(true);
		this.store.setNotasCursoId(cursoId);

		this.api
			.getNotasSalon(salonId, cursoId)
			.pipe(
				withRetry({ tag: 'ProfesorFacade:loadNotasSalon' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (data) => {
					this.store.setNotasSalon(data);
					this.store.setNotasSalonLoading(false);
				},
				error: (err) => {
					logger.error('ProfesorFacade: Error al cargar notas del salón', err);
					this.store.setNotasSalonLoading(false);
				},
			});
	}

	setEsVerano(esVerano: boolean): void {
		this.store.setEsVerano(esVerano);
	}

	setNotasVista(vista: VistaPromedio): void {
		this.store.setNotasVistaActual(vista);
	}

	saveNotaSalon(calificacionId: number, estudianteId: number, nota: number | null): void {
		const salonId = this.store.selectedSalon()?.salonId;
		const cursoId = this.store.notasCursoId();
		if (!salonId || !cursoId) return;

		const previousNota = this.store.getNotaEstudiante(estudianteId, calificacionId);

		this.wal.execute({
			operation: nota === null ? 'DELETE' : 'UPDATE',
			resourceType: 'calificacionSalon',
			resourceId: calificacionId,
			endpoint: nota === null
				? `${this.calificacionUrl}/${calificacionId}/estudiante/${estudianteId}`
				: `${this.calificacionUrl}/${calificacionId}/calificar`,
			method: nota === null ? 'DELETE' : 'POST',
			payload: nota === null ? null : { notas: [{ estudianteId, nota, observacion: null }] },
			http$: () => nota === null
				? this.api.eliminarNotaEstudiante(calificacionId, estudianteId)
				: this.api.calificarLote(calificacionId, { notas: [{ estudianteId, nota, observacion: null }] }),
			optimistic: {
				apply: () => this.store.updateNotaEstudiante(estudianteId, calificacionId, nota),
				rollback: () => this.store.updateNotaEstudiante(estudianteId, calificacionId, previousNota),
			},
			onCommit: () => {},
			onError: (err) => {
				logger.error('ProfesorFacade: Error al guardar/eliminar nota', err);
				this.errorHandler.showError(
					UI_SUMMARIES.error,
					nota === null ? 'No se pudo eliminar la nota' : 'No se pudo guardar la nota',
				);
			},
		});
	}
	// #endregion

	// #region Reads delegados (sub-features sin store propio)
	getContenido(horarioId: number): Observable<CursoContenidoDetalleDto | null> {
		return this.api.getContenido(horarioId);
	}

	getServerTime(): Observable<string | null> {
		return this.api.getServerTime();
	}
	// #endregion

	// #region Boletas PDF
	descargarBoletaEstudiante(estudianteId: number, salonId: number, nombreEstudiante: string): void {
		this.api
			.descargarBoletaEstudiante(estudianteId, salonId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blob) => downloadBlob(blob, `Boleta_${nombreEstudiante}.pdf`),
				error: (err) =>
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						resolveErrorMessage(err, 'No se pudo descargar la boleta'),
					),
			});
	}

	descargarBoletaSalon(salonId: number, salonNombre: string): void {
		this.api
			.descargarBoletaSalon(salonId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blob) => downloadBlob(blob, `Boletas_${salonNombre}.pdf`),
				error: (err) =>
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						resolveErrorMessage(err, 'No se pudo descargar las boletas del salón'),
					),
			});
	}
	// #endregion
}
