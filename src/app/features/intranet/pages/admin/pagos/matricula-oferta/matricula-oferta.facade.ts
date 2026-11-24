// #region Imports
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { logger } from '@core/helpers';
import type { ResultadoGeneracion, VistaPreviaGeneracion } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { type ErrorHttpLike, mensajeDeError, vistaPreviaDesactualizada } from '../utils/carga-inicial.logic';
import { armarPayloadAlumno, hayAlgoQueCrear } from './matricula-oferta.logic';
// #endregion

/**
 * Ofrecer «Generar matrícula e inscripción» a un alumno concreto (P123 F8): vista previa → confirmar. Se provee a nivel
 * de componente, uno por ofrecimiento.
 * - La vista previa no escribe y explica en `omitidos[]` por qué no hay nada que crear (sin parámetros, sin monto, sin
 *   salón del año) en vez de lanzar.
 * - Marcar o desmarcar «alumno nuevo» recalcula sola la vista previa: no se confirma un conteo que nadie vio.
 * - Idempotente en el BE: repetir (o un corte de red) no duplica; aparece como «ya existen».
 * - `409` → se recalcula y la persona vuelve a confirmar. 4xx/429 nunca se reintentan.
 * - El aviso suave de F7 (`matricula-sin-cargo`) nunca bloquea: si falla, se calla.
 */
@Injectable()
export class MatriculaOfertaFacade {
	private readonly api = inject(PagosApiService);

	readonly esNuevo = signal(false);
	readonly vistaPrevia = signal<VistaPreviaGeneracion | null>(null);
	readonly calculando = signal(false);
	readonly generando = signal(false);
	readonly error = signal<string | null>(null);
	readonly resultado = signal<ResultadoGeneracion | null>(null);

	private anio = 0;
	private estudianteId = 0;

	/** Fija el alumno y el año y calcula la primera vista previa. */
	iniciar(estudianteId: number, anio: number): void {
		this.estudianteId = estudianteId;
		this.anio = anio;
		this.esNuevo.set(false);
		this.resultado.set(null);
		this.calcular();
	}

	cambiarNuevo(esNuevo: boolean): void {
		if (this.generando()) return;
		this.esNuevo.set(esNuevo);
		this.calcular();
	}

	calcular(aviso: string | null = null): void {
		if (this.calculando() || this.generando() || this.estudianteId === 0) return;
		this.calculando.set(true);
		this.error.set(aviso);
		this.resultado.set(null);
		this.api.vistaPreviaGeneracionAlumno(armarPayloadAlumno(this.anio, this.estudianteId, this.esNuevo())).subscribe({
			next: (vp) => {
				this.vistaPrevia.set(vp);
				this.calculando.set(false);
			},
			error: (err: ErrorHttpLike) => {
				logger.error('[MatriculaOfertaFacade] Error en la vista previa', err);
				this.vistaPrevia.set(null);
				this.error.set(mensajeDeError(err, 'vista-previa'));
				this.calculando.set(false);
			},
		});
	}

	generar(): void {
		const vp = this.vistaPrevia();
		if (!hayAlgoQueCrear(vp) || this.generando() || this.calculando() || !vp) return;
		this.generando.set(true);
		this.error.set(null);
		this.api.generarCargosAlumno(armarPayloadAlumno(this.anio, this.estudianteId, this.esNuevo()), vp.aCrear).subscribe({
			next: (res) => {
				this.generando.set(false);
				this.vistaPrevia.set(null);
				this.resultado.set(res);
			},
			error: (err: ErrorHttpLike) => {
				logger.error('[MatriculaOfertaFacade] Error al generar los cargos', err);
				this.generando.set(false);
				const mensaje = mensajeDeError(err, 'generar');
				if (vistaPreviaDesactualizada(err) || err.status === 0) {
					// El conteo mostrado ya no es el real (o no se sabe): se recalcula y se conserva el aviso.
					this.calcular(mensaje);
					return;
				}
				this.error.set(mensaje);
			},
		});
	}

	/** `true` si el alumno quedó matriculado sin cargo de matrícula. Ante cualquier falla, `false`: es solo un aviso. */
	async quedaSinCargo(): Promise<boolean> {
		if (this.estudianteId === 0) return false;
		try {
			const aviso = await firstValueFrom(this.api.matriculaSinCargo(this.estudianteId, this.anio));
			return aviso.sinCargoMatricula;
		} catch (err) {
			logger.warn('[MatriculaOfertaFacade] No se pudo consultar el aviso de matrícula sin cargo', err);
			return false;
		}
	}
}
