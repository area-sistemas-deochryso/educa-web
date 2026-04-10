import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StudentSchedulesStore } from './estudiante-horarios.store';
import { EstudianteApiService } from '../../services/estudiante-api.service';
import { logger } from '@core/helpers';
import { SmartNotificationService } from '@core/services/notifications/smart-notification.service';

@Injectable({ providedIn: 'root' })
export class StudentSchedulesFacade {
	// #region Dependencias
	private readonly store = inject(StudentSchedulesStore);
	private readonly api = inject(EstudianteApiService);
	private readonly smartNotif = inject(SmartNotificationService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos
	loadData(): void {
		this.store.setLoading(true);
		this.store.setError(null);

		this.api.getMisHorarios().pipe(
			takeUntilDestroyed(this.destroyRef),
		).subscribe({
			next: (horarios) => {
				this.store.setHorarios(horarios);
				this.store.setLoading(false);
				this.smartNotif.saveHorarioSnapshot(horarios);
			},
			error: (err) => {
				logger.error('Error al cargar horarios del estudiante', err);
				this.store.setError('No se pudieron cargar los horarios');
				this.store.setLoading(false);
			},
		});
	}
	// #endregion
}
