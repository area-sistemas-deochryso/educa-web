// #region Imports
import { Injectable, inject, signal } from '@angular/core';

import { downloadBlob, logger } from '@core/helpers';
import { PagosApiService } from './pagos-api.service';
// #endregion

/** Mensaje en español según el status; el cuerpo del error llega como blob, así que no hay `errorCode` que leer. */
export function mensajeConstanciaError(err: unknown): string {
	const status = (err as { status?: number } | null)?.status;
	if (status === 0) return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
	if (status === 403) return 'No tienes permiso para descargar constancias de pago.';
	if (status === 404) return 'No se encontró el pago. Recarga la pantalla e inténtalo de nuevo.';
	if (status === 429) return 'Hay muchas descargas seguidas. Espera un momento e inténtalo de nuevo.';
	return 'No se pudo descargar la constancia. Inténtalo de nuevo.';
}

/**
 * Descarga la constancia de pago en PDF (`INV-PG15`). Se provee a nivel de componente.
 * - Una descarga a la vez: mientras `descargando` tiene un id se ignoran las demás.
 * - Sin reintentos automáticos: 4xx/429 nunca se reintentan; la persona repite a mano.
 */
@Injectable()
export class ConstanciaPagoFacade {
	private readonly api = inject(PagosApiService);

	/** Id del pago que se está descargando; `null` si no hay descarga en curso. */
	readonly descargando = signal<number | null>(null);
	readonly error = signal<string | null>(null);

	descargar(pagoId: number): void {
		if (this.descargando() !== null) return;
		this.descargando.set(pagoId);
		this.error.set(null);
		this.api.constancia(pagoId).subscribe({
			next: ({ blob, fileName }) => {
				downloadBlob(blob, fileName);
				this.descargando.set(null);
			},
			error: (err: unknown) => {
				logger.error('[ConstanciaPagoFacade] Error al descargar la constancia', err);
				this.error.set(mensajeConstanciaError(err));
				this.descargando.set(null);
			},
		});
	}

	limpiarError(): void {
		this.error.set(null);
	}
}
