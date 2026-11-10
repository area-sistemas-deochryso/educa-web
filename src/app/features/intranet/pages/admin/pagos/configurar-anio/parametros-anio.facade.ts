// #region Imports
import { Injectable, inject, signal } from '@angular/core';

import { logger } from '@core/helpers';
import type { ParametroAnio } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import {
	type DatosParametros,
	type ErrorHttpLike,
	anioSinParametros,
	armarPayloadParametros,
	mensajeDeError,
} from '../utils/carga-inicial.logic';
// #endregion

/**
 * Parámetros de cobranza del año (pago mínimo, recargo y fecha inicial). Se provee a nivel de componente.
 * - `server-confirmed`: lo mostrado es siempre lo último que devolvió el servidor, incluido su `rowVersion` (`INV-S05`).
 * - Un año sin fila no es un error: `parametros` queda en `null` y el formulario se muestra vacío para crearlo.
 * - Un `409` de competencia o un corte de red relee el año: la persona revisa y vuelve a guardar. Sin reintentos.
 */
@Injectable()
export class ParametrosAnioFacade {
	private readonly api = inject(PagosApiService);

	readonly anio = signal<number | null>(null);
	readonly parametros = signal<ParametroAnio | null>(null);
	readonly cargando = signal(false);
	readonly guardando = signal(false);
	readonly error = signal<string | null>(null);
	readonly guardado = signal(false);

	cargar(anio: number): void {
		this.anio.set(anio);
		this.parametros.set(null);
		this.error.set(null);
		this.guardado.set(false);
		this.cargando.set(true);
		this.api.parametrosAnio(anio).subscribe({
			next: (p) => {
				if (this.anio() !== anio) return;
				this.parametros.set(p);
				this.cargando.set(false);
			},
			error: (err: ErrorHttpLike) => {
				if (this.anio() !== anio) return;
				this.cargando.set(false);
				if (anioSinParametros(err)) return;
				logger.error('[ParametrosAnioFacade] Error al cargar los parámetros', err);
				this.error.set(mensajeDeError(err, 'cargar-parametros'));
			},
		});
	}

	guardar(datos: DatosParametros): void {
		if (this.guardando()) return;
		this.guardando.set(true);
		this.error.set(null);
		this.guardado.set(false);
		// eslint-disable-next-line wal/no-direct-mutation-subscribe -- Razón: parámetros de cobranza admin-only, server-confirmed; llevan `rowVersion` (INV-S05), así que encolarlos offline los reaplicaría con una versión vieja. Si falla, la persona ve el error y relee.
		this.api.guardarParametrosAnio(armarPayloadParametros(datos, this.parametros())).subscribe({
			next: (p) => {
				this.parametros.set(p);
				this.guardando.set(false);
				this.guardado.set(true);
			},
			error: (err: ErrorHttpLike) => {
				logger.error('[ParametrosAnioFacade] Error al guardar los parámetros', err);
				this.error.set(mensajeDeError(err, 'guardar-parametros'));
				this.guardando.set(false);
				// Con competencia (409) o sin respuesta el rowVersion mostrado ya no es de fiar: se vuelve a leer.
				if (err.status === 409 || err.status === 0) this.releer(datos.anio);
			},
		});
	}

	/** Releer sin borrar el mensaje de error que explica por qué se recarga. */
	private releer(anio: number): void {
		this.api.parametrosAnio(anio).subscribe({
			next: (p) => {
				if (this.anio() === anio) this.parametros.set(p);
			},
			error: (err: ErrorHttpLike) => logger.error('[ParametrosAnioFacade] Error al releer los parámetros', err),
		});
	}
}
