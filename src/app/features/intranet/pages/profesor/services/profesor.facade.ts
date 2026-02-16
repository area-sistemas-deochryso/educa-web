import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { logger } from '@core/helpers';
import { UserProfileService } from '@core/services/user/user-profile.service';
import { ProfesorApiService } from './profesor-api.service';
import { ProfesorStore, ProfesorSalonConEstudiantes } from './profesor.store';

@Injectable({ providedIn: 'root' })
export class ProfesorFacade {
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(ProfesorStore);
	private readonly userProfile = inject(UserProfileService);
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

		forkJoin({
			horarios: this.api.getHorarios(profesorId),
			salonTutoria: this.api.getSalonTutoria(profesorId),
			misEstudiantes: this.api.getMisEstudiantes(),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ horarios, salonTutoria, misEstudiantes }) => {
					this.store.setHorarios(horarios);
					this.store.setSalonTutoria(salonTutoria.data);
					this.store.setMisEstudiantes(misEstudiantes);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('ProfesorFacade: Error al cargar datos', err);
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
		this.store.openSalonDialog(salon);

		this.api
			.getEstudiantesSalon(salon.salonId)
			.pipe(takeUntilDestroyed(this.destroyRef))
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
				error: () => {
					logger.error('ProfesorFacade: Error al cargar estudiantes del salón');
					this.store.setSalonDialogLoading(false);
				},
			});
	}

	closeSalonDialog(): void {
		this.store.closeSalonDialog();
	}
	// #endregion
}
