import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EstudianteHorariosStore } from './estudiante-horarios.store';
import { EstudianteApiService } from '../../services/estudiante-api.service';
import { logger } from '@core/helpers';

@Injectable({ providedIn: 'root' })
export class EstudianteHorariosFacade {
	// #region Dependencias
	private readonly store = inject(EstudianteHorariosStore);
	private readonly api = inject(EstudianteApiService);
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
