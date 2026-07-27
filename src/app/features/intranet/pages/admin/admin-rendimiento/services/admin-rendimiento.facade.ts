import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger, withRetry } from '@core/helpers';
import { AdminRendimientoApiService } from './admin-rendimiento-api.service';
import { AdminRendimientoStore } from './admin-rendimiento.store';

@Injectable({ providedIn: 'root' })
export class AdminRendimientoFacade {
	private readonly api = inject(AdminRendimientoApiService);
	private readonly store = inject(AdminRendimientoStore);
	private readonly destroyRef = inject(DestroyRef);

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos
	loadRendimiento(): void {
		this.store.setLoading(true);
		this.store.setError(null);

		this.api
			.getInstitucional()
			.pipe(
				withRetry({ tag: 'AdminRendimientoFacade:loadRendimiento' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (cursos) => {
					this.store.setCursos(cursos);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('AdminRendimientoFacade: Error al cargar rendimiento institucional', err);
					this.store.setError('No se pudo cargar el rendimiento institucional');
					this.store.setLoading(false);
				},
			});
	}

	refresh(): void {
		this.loadRendimiento();
	}
	// #endregion
}
