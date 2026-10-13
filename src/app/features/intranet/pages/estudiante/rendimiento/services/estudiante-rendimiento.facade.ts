import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { logger, withRetry } from '@core/helpers';
import { EstudianteApiService } from '../../services/estudiante-api.service';
import { EstudianteRendimientoApiService } from './estudiante-rendimiento-api.service';
import { EstudianteRendimientoStore } from './estudiante-rendimiento.store';

@Injectable({ providedIn: 'root' })
export class EstudianteRendimientoFacade {
	private readonly api = inject(EstudianteRendimientoApiService);
	private readonly notasApi = inject(EstudianteApiService);
	private readonly store = inject(EstudianteRendimientoStore);
	private readonly destroyRef = inject(DestroyRef);

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos
	loadRendimiento(): void {
		this.store.setLoading(true);
		this.store.setError(null);

		// La escala (INV-U06) solo llega en `mis-notas`: si falla, el eje cae a lo numérico sin romper la página.
		forkJoin({
			rendimiento: this.api.getMiRendimiento().pipe(withRetry({ tag: 'EstudianteRendimientoFacade:loadRendimiento' })),
			notas: this.notasApi.getMisNotas().pipe(
				withRetry({ tag: 'EstudianteRendimientoFacade:loadEscalas' }),
				catchError((err) => {
					logger.warn('EstudianteRendimientoFacade: sin escala, eje numérico', err);
					return of([]);
				}),
			),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ rendimiento: dto, notas }) => {
					this.store.setEscalas(Object.fromEntries(notas.map((n) => [n.cursoContenidoId, n.escalaCalificacion ?? null])));
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
