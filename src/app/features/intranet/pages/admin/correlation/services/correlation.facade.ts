import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { logger } from '@core/helpers';

import { CorrelationService } from './correlation.service';
import { CorrelationStore } from './correlation.store';

@Injectable({ providedIn: 'root' })
export class CorrelationFacade {
	// #region Dependencias
	private readonly api = inject(CorrelationService);
	private readonly store = inject(CorrelationStore);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Carga
	loadSnapshot(correlationId: string): void {
		const trimmed = correlationId.trim();
		if (!trimmed) {
			this.store.setError('CorrelationId vacío');
			this.store.setSnapshot(null);
			this.store.setLoading(false);
			return;
		}

		this.store.setCorrelationId(trimmed);
		this.store.setLoading(true);
		this.store.setError(null);
		this.store.setSnapshot(null);

		this.api
			.getSnapshot(trimmed)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (snapshot) => {
					this.store.setSnapshot(snapshot);
					this.store.setLoading(false);
				},
				error: (err: HttpErrorResponse) => {
					logger.error('[CorrelationFacade] Error cargando snapshot', err);
					this.store.setSnapshot(null);
					this.store.setLoading(false);
					if (err.status === 400) {
						this.store.setError(
							'CorrelationId inválido. Verificá el formato (máx 64 chars, no vacío).',
						);
					} else if (err.status === 401 || err.status === 403) {
						this.store.setError('No tenés permiso para consultar este correlation id.');
					} else {
						this.store.setError(
							'No se pudo cargar el snapshot. Reintentá en unos segundos.',
						);
					}
				},
			});
	}

	reset(): void {
		this.store.reset();
	}
	// #endregion
}
