// #region Imports
import { Injectable, inject, signal } from '@angular/core';
import type { Observable } from 'rxjs';

import { logger } from '@core/helpers';
import type { RegistrarAjustePayload } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { type AccionCuenta, type ErrorHttpLike, mensajeDeError, requiereRecarga } from './acciones-cuenta.logic';
// #endregion

/** Lo que la pantalla necesita saber al terminar una acción: si cerrar el diálogo y si recargar la cuenta. */
export interface ResultadoAccion {
	exito: boolean;
	recargar: boolean;
}

/**
 * Acciones que mutan la cuenta: anular pago, registrar ajuste y anular ajuste. Se provee a nivel de componente.
 * - `server-confirmed`: nada se pinta antes de la respuesta; la pantalla recarga la cuenta completa (no parchea una fila).
 * - Una acción a la vez: mientras `guardando` es `true` se ignoran las demás.
 * - Sin reintentos: 4xx/429 nunca se reintentan; la persona repite a mano.
 */
@Injectable()
export class AccionesCuentaFacade {
	private readonly api = inject(PagosApiService);

	readonly guardando = signal(false);
	readonly error = signal<string | null>(null);

	anularPago(pagoId: number, motivo: string, alTerminar: (r: ResultadoAccion) => void): void {
		this.ejecutar('anular-pago', () => this.api.anularPago(pagoId, motivo.trim()), alTerminar);
	}

	registrarAjuste(payload: RegistrarAjustePayload, alTerminar: (r: ResultadoAccion) => void): void {
		this.ejecutar('registrar-ajuste', () => this.api.registrarAjuste(payload), alTerminar);
	}

	anularAjuste(ajusteId: number, motivo: string, alTerminar: (r: ResultadoAccion) => void): void {
		this.ejecutar('anular-ajuste', () => this.api.anularAjuste(ajusteId, motivo.trim()), alTerminar);
	}

	/** Borra el error al abrir otro diálogo. */
	limpiarError(): void {
		this.error.set(null);
	}

	private ejecutar(accion: AccionCuenta, peticion: () => Observable<unknown>, alTerminar: (r: ResultadoAccion) => void): void {
		if (this.guardando()) return;
		this.guardando.set(true);
		this.error.set(null);
		peticion().subscribe({
			next: () => {
				this.guardando.set(false);
				alTerminar({ exito: true, recargar: true });
			},
			error: (err: ErrorHttpLike) => {
				logger.error(`[AccionesCuentaFacade] Error en ${accion}`, err);
				this.error.set(mensajeDeError(err, accion));
				this.guardando.set(false);
				alTerminar({ exito: false, recargar: requiereRecarga(err) });
			},
		});
	}
}
