import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry } from '@core/helpers';
import { EstudianteRendimientoApiService } from './estudiante-rendimiento-api.service';
import { EstudianteRendimientoStore } from './estudiante-rendimiento.store';

@Injectable({ providedIn: 'root' })
export class EstudianteRendimientoFacade {
	private readonly api = inject(EstudianteRendimientoApiService);
	private readonly store = inject(EstudianteRendimientoStore);
	private readonly destroyRef = inject(DestroyRef);

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos
	loadRendimiento(): void {
		this.store.setLoading(true);
		this.store.setError(null);

		this.api
			.getMiRendimiento()
			.pipe(
				withRetry({ tag: 'EstudianteRendimientoFacade:loadRendimiento' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (dto) => {
					this.store.setCursos(dto.cursos);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('EstudianteRendimientoFacade: Error al cargar rendimiento', err);
					this.store.setError('No se pudo cargar tu rendimiento académico');
					this.store.setLoading(false);
				},
			});
	}
	// #endregion
}
