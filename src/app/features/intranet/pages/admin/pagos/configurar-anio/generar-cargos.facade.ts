// #region Imports
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap } from 'rxjs';

import { logger } from '@core/helpers';
import type { EstudianteBusqueda, GenerarCargosPayload, ResultadoGeneracion, VistaPreviaGeneracion } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { type ErrorHttpLike, mensajeDeError, vistaPreviaDesactualizada } from '../utils/carga-inicial.logic';
// #endregion

/**
 * Generar cargos del año: vista previa → confirmar (D2). Se provee a nivel de componente.
 * - La ejecución viaja con `crearEsperados` = `aCrear` de la vista previa. Si el BE responde `409` (los datos cambiaron),
 *   se recalcula sola la vista previa y la persona vuelve a confirmar; el BE no escribió nada (todo o nada).
 * - Cualquier cambio en lo elegido invalida la vista previa (`invalidar`): no se puede confirmar un conteo viejo.
 * - Idempotente en el BE: repetir tras un corte de red no duplica; aparece como «ya existen».
 * - Sin reintentos: 4xx/429 nunca se reintentan.
 */
@Injectable()
export class GenerarCargosFacade {
	private readonly api = inject(PagosApiService);
	private readonly destroyRef = inject(DestroyRef);

	readonly vistaPrevia = signal<VistaPreviaGeneracion | null>(null);
	readonly calculando = signal(false);
	readonly generando = signal(false);
	readonly error = signal<string | null>(null);
	readonly resultado = signal<ResultadoGeneracion | null>(null);

	readonly sugerencias = signal<EstudianteBusqueda[]>([]);
	readonly errorBusqueda = signal<string | null>(null);

	private readonly consulta$ = new Subject<string>();
	private ultimoPayload: GenerarCargosPayload | null = null;

	constructor() {
		// switchMap descarta la respuesta de la búsqueda anterior si ya hay una más nueva.
		this.consulta$
			.pipe(
				switchMap((texto) =>
					this.api.buscarEstudiantes(texto).pipe(
						catchError((err: unknown) => {
							logger.error('[GenerarCargosFacade] Error al buscar alumnos', err);
							this.errorBusqueda.set('No se pudo buscar alumnos. Intenta de nuevo.');
							return of<EstudianteBusqueda[]>([]);
						}),
					),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((lista) => this.sugerencias.set(lista));
	}

	/** Busca por nombre o DNI. Con menos de 2 caracteres no consulta (el servidor lo rechaza). */
	buscarEstudiantes(texto: string): void {
		const limpio = texto.trim();
		if (limpio.length < 2) {
			this.sugerencias.set([]);
			return;
		}
		this.errorBusqueda.set(null);
		this.consulta$.next(limpio);
	}

	/** La elección cambió: el conteo y el resultado anteriores ya no describen lo que se va a generar. */
	invalidar(): void {
		this.vistaPrevia.set(null);
		this.resultado.set(null);
		this.error.set(null);
	}

	calcular(payload: GenerarCargosPayload, aviso: string | null = null): void {
		if (this.calculando() || this.generando()) return;
		this.ultimoPayload = payload;
		this.calculando.set(true);
		this.error.set(aviso);
		this.resultado.set(null);
		this.api.vistaPreviaGeneracion(payload).subscribe({
			next: (vp) => {
				this.vistaPrevia.set(vp);
				this.calculando.set(false);
			},
			error: (err: ErrorHttpLike) => {
				logger.error('[GenerarCargosFacade] Error en la vista previa', err);
				this.vistaPrevia.set(null);
				this.error.set(mensajeDeError(err, 'vista-previa'));
				this.calculando.set(false);
			},
		});
	}

	generar(): void {
		const vp = this.vistaPrevia();
		const payload = this.ultimoPayload;
		if (!vp || !payload || this.generando() || this.calculando() || vp.aCrear === 0) return;
		this.generando.set(true);
		this.error.set(null);
		this.api.generarCargos(payload, vp.aCrear).subscribe({
			next: (res) => {
				this.generando.set(false);
				this.vistaPrevia.set(null);
				this.resultado.set(res);
			},
			error: (err: ErrorHttpLike) => {
				logger.error('[GenerarCargosFacade] Error al generar los cargos', err);
				this.generando.set(false);
				const mensaje = mensajeDeError(err, 'generar');
				if (vistaPreviaDesactualizada(err) || err.status === 0) {
					// El conteo mostrado ya no es el real (o no se sabe): se recalcula y se conserva el aviso.
					this.calcular(payload, mensaje);
					return;
				}
				this.error.set(mensaje);
			},
		});
	}
}
