// #region Imports
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap, tap } from 'rxjs';

import { logger } from '@core/helpers';
import type { EstadoCuenta, EstudianteBusqueda } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
// #endregion

type CuentaResult = { ok: true; data: EstadoCuenta } | { ok: false; noExiste: boolean };

/**
 * Estado de «Estado de cuenta». Se provee a nivel de componente.
 * - El alumno llega por la ruta (`:estudianteId`) o se elige con el buscador.
 * - `switchMap` descarta la respuesta de un alumno anterior si ya se pidió otro.
 * - Sin reintentos: 4xx/429 nunca se reintentan; la persona reintenta a mano.
 */
@Injectable()
export class EstadoCuentaFacade {
	private readonly api = inject(PagosApiService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly cuenta$ = new Subject<number>();
	private readonly busqueda$ = new Subject<string>();
	private ultimoId: number | null = null;

	readonly cuenta = signal<EstadoCuenta | null>(null);
	readonly loading = signal(false);
	readonly error = signal<string | null>(null);

	readonly sugerencias = signal<EstudianteBusqueda[]>([]);
	readonly errorBusqueda = signal<string | null>(null);

	constructor() {
		this.cuenta$
			.pipe(
				tap(() => {
					this.loading.set(true);
					this.error.set(null);
				}),
				switchMap((id) =>
					this.api.estadoCuenta(id).pipe(
						map((data): CuentaResult => ({ ok: true, data })),
						catchError((err: { status?: number }) => {
							logger.error('[EstadoCuentaFacade] Error al cargar el estado de cuenta', err);
							return of<CuentaResult>({ ok: false, noExiste: err?.status === 404 });
						}),
					),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				this.loading.set(false);
				if (result.ok) {
					this.cuenta.set(result.data);
					return;
				}
				this.cuenta.set(null);
				this.error.set(result.noExiste ? 'No se encontró al alumno.' : 'No se pudo cargar el estado de cuenta.');
			});

		this.busqueda$
			.pipe(
				switchMap((texto) =>
					this.api.buscarEstudiantes(texto).pipe(
						catchError((err: unknown) => {
							logger.error('[EstadoCuentaFacade] Error al buscar alumnos', err);
							this.errorBusqueda.set('No se pudo buscar alumnos. Intenta de nuevo.');
							return of<EstudianteBusqueda[]>([]);
						}),
					),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((lista) => this.sugerencias.set(lista));
	}

	/** Carga la cuenta completa del alumno. Llamarlo de nuevo tras una acción recarga todo, no una fila. */
	cargar(estudianteId: number): void {
		this.ultimoId = estudianteId;
		this.cuenta$.next(estudianteId);
	}

	recargar(): void {
		if (this.ultimoId !== null) this.cargar(this.ultimoId);
	}

	/** Quita la cuenta mostrada (ruta sin alumno). */
	limpiar(): void {
		this.ultimoId = null;
		this.cuenta.set(null);
		this.error.set(null);
		this.loading.set(false);
	}

	/** Con menos de 2 caracteres no consulta (el servidor lo rechaza). */
	buscarEstudiantes(texto: string): void {
		const limpio = texto.trim();
		if (limpio.length < 2) {
			this.sugerencias.set([]);
			return;
		}
		this.errorBusqueda.set(null);
		this.busqueda$.next(limpio);
	}
}
