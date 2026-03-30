import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import { SmartNotificationService } from '@core/services/notifications/smart-notification.service';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';
import { UserProfileService } from '@core/services/user/user-profile.service';
import { VistaPromedio } from '../models';
import { ProfesorApiService } from './profesor-api.service';
import { ProfesorStore, ProfesorSalonConEstudiantes } from './profesor.store';

@Injectable({ providedIn: 'root' })
export class ProfesorFacade {
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(ProfesorStore);
	private readonly userProfile = inject(UserProfileService);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly smartNotif = inject(SmartNotificationService);
	private readonly destroyRef = inject(DestroyRef);

	// #region Estado expuesto
	readonly vm = this.store.vm;

	// #endregion
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
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadProfesorData,
					);
					this.store.setError(UI_ADMIN_ERROR_DETAILS.loadProfesorData);
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
						UI_ADMIN_ERROR_DETAILS.loadEstudiantesSalon,
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

	setNotasVista(vista: VistaPromedio): void {
		this.store.setNotasVistaActual(vista);
	}

	/**
	 * Save or delete an individual nota.
	 * null = delete the nota, number = save/update via calificarLote.
	 */
	saveNotaSalon(calificacionId: number, estudianteId: number, nota: number | null): void {
		const salonId = this.store.selectedSalon()?.salonId;
		const cursoId = this.store.notasCursoId();
		if (!salonId || !cursoId) return;

		const apiCall =
			nota === null
				? this.api.eliminarNotaEstudiante(calificacionId, estudianteId)
				: this.api.calificarLote(calificacionId, {
						notas: [{ estudianteId, nota, observacion: null }],
					});

		apiCall.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => {
				this.store.updateNotaEstudiante(estudianteId, calificacionId, nota);
			},
			error: (err) => {
				logger.error('ProfesorFacade: Error al guardar/eliminar nota', err);
				this.errorHandler.showError(
					UI_SUMMARIES.error,
					nota === null ? 'No se pudo eliminar la nota' : 'No se pudo guardar la nota',
				);
			},
		});
	}
	// #endregion
}
