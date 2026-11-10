// #region Imports
import { Injectable, inject, signal } from '@angular/core';

import { logger } from '@core/helpers';
import type { ConfirmarSinDatoPayload, FiltroSinDato, ResultadoConfirmacion, VistaPreviaConfirmacion } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { type ErrorHttpLike, mensajeDeError, vistaPreviaDesactualizada } from '../utils/carga-inicial.logic';
// #endregion

/**
 * Confirmar «sin dato» en bloque (D7, D9): vista previa → desenlace → confirmar. Se provee a nivel de componente.
 * - La ejecución viaja con `cargosEsperados` = `cargos` de la vista previa. Si el BE responde `409` (el conjunto cambió),
 *   no escribió nada: se recalcula la vista previa y la persona confirma de nuevo con el número nuevo a la vista.
 * - Una sola transacción por lote en el BE: se confirma todo el conjunto o nada.
 * - Sin reintentos: 4xx/429 nunca se reintentan. Tras un corte de red se recalcula: si ya se confirmó, el conteo baja.
 */
@Injectable()
export class ConfirmarLoteFacade {
	private readonly api = inject(PagosApiService);

	readonly vistaPrevia = signal<VistaPreviaConfirmacion | null>(null);
	readonly calculando = signal(false);
	readonly confirmando = signal(false);
	readonly error = signal<string | null>(null);
	readonly resultado = signal<ResultadoConfirmacion | null>(null);

	private ultimoFiltro: FiltroSinDato | null = null;

	/** Cambió el filtro o se reabrió el diálogo: el conteo anterior ya no describe lo que se va a confirmar. */
	reiniciar(): void {
		this.vistaPrevia.set(null);
		this.resultado.set(null);
		this.error.set(null);
		this.ultimoFiltro = null;
	}

	calcular(filtro: FiltroSinDato, aviso: string | null = null): void {
		if (this.calculando() || this.confirmando()) return;
		this.ultimoFiltro = filtro;
		this.calculando.set(true);
		this.error.set(aviso);
		this.resultado.set(null);
		this.api.vistaPreviaConfirmacion(filtro).subscribe({
			next: (vp) => {
				this.vistaPrevia.set(vp);
				this.calculando.set(false);
			},
			error: (err: ErrorHttpLike) => {
				logger.error('[ConfirmarLoteFacade] Error en la vista previa', err);
				this.vistaPrevia.set(null);
				this.error.set(mensajeDeError(err, 'vista-previa'));
				this.calculando.set(false);
			},
		});
	}

	/** `payload.cargosEsperados` debe ser el conteo de la vista previa que la persona vio. */
	confirmar(payload: ConfirmarSinDatoPayload): void {
		if (this.confirmando() || this.calculando()) return;
		this.confirmando.set(true);
		this.error.set(null);
		// eslint-disable-next-line wal/no-direct-mutation-subscribe -- Razón: confirmación en bloque admin-only, server-confirmed; exige la vista previa vigente (`cargosEsperados`), así que NO debe encolarse offline ni reaplicarse tarde. Si falla, la persona ve el error y recalcula.
		this.api.confirmarSinDato(payload).subscribe({
			next: (res) => {
				this.confirmando.set(false);
				this.vistaPrevia.set(null);
				this.resultado.set(res);
			},
			error: (err: ErrorHttpLike) => {
				logger.error('[ConfirmarLoteFacade] Error al confirmar los cargos', err);
				this.confirmando.set(false);
				const mensaje = mensajeDeError(err, 'confirmar');
				if (vistaPreviaDesactualizada(err) || err.status === 0) {
					// El conteo mostrado ya no es el real (o no se sabe): se recalcula y se conserva el aviso.
					this.calcular(payload.filtro, mensaje);
					return;
				}
				this.error.set(mensaje);
			},
		});
	}
}
