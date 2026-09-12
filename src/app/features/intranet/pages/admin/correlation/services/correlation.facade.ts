import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, catchError, of, switchMap } from 'rxjs';

import { logger } from '@core/helpers';

import { CorrelationSnapshot } from '../models';
import { CorrelationService } from './correlation.service';
import { CorrelationStore } from './correlation.store';

interface SnapshotResult {
	snapshot: CorrelationSnapshot | null;
	error: HttpErrorResponse | null;
}

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
	private readonly load$ = new Subject<string>();

	constructor() {
		this.load$
			.pipe(
				switchMap((trimmed) =>
					this.api.getSnapshot(trimmed).pipe(
						switchMap((snapshot) => of<SnapshotResult>({ snapshot, error: null })),
						catchError((err: HttpErrorResponse) => of<SnapshotResult>({ snapshot: null, error: err })),
					),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(({ snapshot, error }) => {
				if (error) {
					logger.error('[CorrelationFacade] Error cargando snapshot', error);
					this.store.setSnapshot(null);
					this.store.setLoading(false);
					if (error.status === 400) {
						this.store.setError(
							'CorrelationId inválido. Verificá el formato (máx 64 chars, no vacío).',
						);
					} else if (error.status === 401 || error.status === 403) {
						this.store.setError('No tenés permiso para consultar este correlation id.');
					} else {
						this.store.setError(
							'No se pudo cargar el snapshot. Reintentá en unos segundos.',
						);
					}
					return;
				}
				this.store.setSnapshot(snapshot);
				this.store.setLoading(false);
			});
	}

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

		this.load$.next(trimmed);
	}

	reset(): void {
		this.store.reset();
	}
	// #endregion
}
