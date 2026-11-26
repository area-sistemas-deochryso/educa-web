import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger, withRetry } from '@core/helpers';
import type { MisPagos } from '@data/models';
import { type ErrorHttp, type ErrorVista, errorVista } from '../mis-pagos.logic';
import { MisPagosApiService } from './mis-pagos-api.service';

/**
 * Estado de «Mis pagos» (solo lectura). Se provee a nivel de componente: cada visita pide los datos de nuevo,
 * porque pagos no se cachea (INV-WAL-RES11) y la familia espera ver lo último que registró el colegio.
 * `withRetry` ya excluye 4xx/429; el 403 «ver como» se explica en pantalla, no se reintenta.
 */
@Injectable()
export class MisPagosFacade {
	private readonly api = inject(MisPagosApiService);
	private readonly destroyRef = inject(DestroyRef);

	readonly cuenta = signal<MisPagos | null>(null);
	readonly loading = signal(false);
	readonly error = signal<ErrorVista | null>(null);

	cargar(): void {
		this.loading.set(true);
		this.error.set(null);

		this.api
			.estadoCuenta()
			.pipe(withRetry({ tag: 'MisPagosFacade:cargar' }), takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (cuenta) => {
					this.cuenta.set(cuenta);
					this.loading.set(false);
				},
				error: (err: ErrorHttp) => {
					logger.error('MisPagosFacade: Error al cargar mis pagos', err);
					this.cuenta.set(null);
					this.error.set(errorVista(err));
					this.loading.set(false);
				},
			});
	}
}
