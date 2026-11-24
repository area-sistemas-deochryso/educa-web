// #region Imports
import { Injectable, inject, signal } from '@angular/core';

import { logger } from '@core/helpers';
import type { ParametroAnio } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import {
	type DatosParametros,
	type ErrorHttpLike,
	TEXTOS_RELECTURA_PARAMETROS,
	anioSinParametros,
	armarPayloadParametros,
	mensajeDeError,
	requiereRelectura,
} from '../utils/carga-inicial.logic';
import { type EstadoCarga, parametrosCambiaron } from './seccion.logic';
// #endregion

/** Sin respuesta, timeout o `5xx`: el PUT pudo aplicarse o no. */
const resultadoIncierto = (err: ErrorHttpLike): boolean =>
	err.status === undefined || err.status === 0 || err.status >= 500;

/**
 * Parámetros de cobranza del año (pago mínimo, recargo y fecha inicial). Se provee a nivel de componente.
 * - `server-confirmed`: lo mostrado es siempre lo último que devolvió el servidor, incluido su `rowVersion` (`INV-S05`).
 * - Un año sin fila no es un error: `parametros` queda en `null`, `estado` en `lista` y el formulario se muestra vacío.
 * - `estado` arranca en `cargando` para que la guía de pasos no muestre «Pendiente» antes de la primera lectura; pasa a
 *   `error` solo si la lectura falla por otra causa, y entonces la base es desconocida: se vuelve a cargar, no se edita.
 * - Si el resultado de guardar es incierto o la base ya no es de fiar (`409`, sin respuesta, timeout o `5xx`), se relee
 *   el año con el mismo criterio que montos y cronograma (`requiereRelectura`). Tras un resultado incierto, el
 *   `rowVersion` releído dice qué pasó (ver `trasRelectura`). Un `400` de regla no relee. Sin reintentos.
 * - Solo la última lectura pedida toca el estado: una respuesta vieja del mismo año (2027 → 2026 → 2027) no pisa la
 *   vigente.
 */
@Injectable()
export class ParametrosAnioFacade {
	private readonly api = inject(PagosApiService);

	// #region Estado
	private readonly _estado = signal<EstadoCarga>('cargando');
	private lecturaId = 0;

	readonly anio = signal<number | null>(null);
	readonly parametros = signal<ParametroAnio | null>(null);
	readonly estado = this._estado.asReadonly();
	readonly guardando = signal(false);
	readonly error = signal<string | null>(null);
	readonly guardado = signal(false);
	// #endregion

	// #region Lectura
	cargar(anio: number): void {
		const id = ++this.lecturaId;
		this.anio.set(anio);
		this.parametros.set(null);
		this.error.set(null);
		this.guardado.set(false);
		this._estado.set('cargando');
		this.api.parametrosAnio(anio).subscribe({
			next: (p) => {
				if (id !== this.lecturaId) return;
				this.parametros.set(p);
				this._estado.set('lista');
			},
			error: (err: ErrorHttpLike) => {
				if (id !== this.lecturaId) return;
				if (anioSinParametros(err)) {
					this._estado.set('lista');
					return;
				}
				logger.error('[ParametrosAnioFacade] Error al cargar los parámetros', err);
				this.error.set(mensajeDeError(err, 'cargar-parametros'));
				this._estado.set('error');
			},
		});
	}

	/** «Volver a cargar» después de un error de lectura. */
	recargar(): void {
		const anio = this.anio();
		if (anio !== null) this.cargar(anio);
	}
	// #endregion

	// #region Guardado
	guardar(datos: DatosParametros): void {
		if (this.guardando()) return;
		// Lo que se envía; al releer tras un resultado incierto, compararlo dice si el PUT se aplicó.
		const rowVersionEnviado = this.parametros()?.rowVersion ?? null;
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
				// Mensaje provisional: la relectura lo reemplaza cuando sabe qué pasó, y se queda si la relectura falla.
				this.error.set(mensajeDeError(err, 'guardar-parametros'));
				this.guardando.set(false);
				if (requiereRelectura(err)) this.releer(datos, err, rowVersionEnviado);
			},
		});
	}

	/** Relee una vez sin borrar el mensaje que explica por qué. Un año sin fila (`404`) sigue sin fila: se relee `null`. */
	private releer(datos: DatosParametros, err: ErrorHttpLike, rowVersionEnviado: string | null): void {
		// Si cambió el año mientras se guardaba, la lectura del año nuevo ya está en curso y manda ella.
		if (this.anio() !== datos.anio) return;
		const id = ++this.lecturaId;
		this.api.parametrosAnio(datos.anio).subscribe({
			next: (p) => {
				if (id === this.lecturaId) this.trasRelectura(datos, err, rowVersionEnviado, p);
			},
			error: (e: ErrorHttpLike) => {
				if (id !== this.lecturaId) return;
				if (anioSinParametros(e)) {
					this.trasRelectura(datos, err, rowVersionEnviado, null);
					return;
				}
				logger.error('[ParametrosAnioFacade] Error al releer los parámetros', e);
			},
		});
	}

	/**
	 * Tras un `409` se adopta lo releído: el mensaje del código ya lo dice. Tras un resultado incierto, el `rowVersion`
	 * releído dice qué pasó:
	 * - el mismo que se envió: el PUT no se aplicó. `parametros` no se toca porque es la base del formulario
	 *   (`linkedSignal`): reemplazarlo, aunque traiga los mismos valores, pisaría lo escrito. Lo escrito sigue en
	 *   pantalla, con cambios y un `rowVersion` vigente para volver a guardar;
	 * - otro, con los valores enviados: el PUT se aplicó y se informa como guardado;
	 * - otro, con otros valores: alguien más los cambió. Se adoptan los suyos y se avisa.
	 */
	private trasRelectura(
		datos: DatosParametros,
		err: ErrorHttpLike,
		rowVersionEnviado: string | null,
		releido: ParametroAnio | null,
	): void {
		const incierto = resultadoIncierto(err);
		if (incierto && (releido?.rowVersion ?? null) === rowVersionEnviado) {
			// Con un 5xx basta el mensaje genérico; sin respuesta, el provisional pedía comprobar algo que ya se sabe.
			if (err.status === 0 || err.status === undefined) {
				this.error.set(TEXTOS_RELECTURA_PARAMETROS.noGuardados);
			}
			return;
		}
		this.parametros.set(releido);
		if (!incierto) return;
		if (releido !== null && !parametrosCambiaron(datos, releido)) {
			this.error.set(null);
			this.guardado.set(true);
			return;
		}
		this.error.set(TEXTOS_RELECTURA_PARAMETROS.conflicto);
	}
	// #endregion
}
