// #region Imports
import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

import { downloadBlob, logger } from '@core/helpers';
import type { MesesPagados, MesesPagadosFiltros, PagoCorte } from '@data/models';
import { ClassroomsAdminApiService } from '@features/intranet/pages/admin/classrooms/services';
import { type OpcionSalon, opcionesSalon } from '../configurar-anio/alumnos-salon.logic';
import { HOY, toIsoLocal } from '../panel-cobranza/panel-cobranza.logic';
import { PagosApiService } from '../services/pagos-api.service';
import { SEARCH_DEBOUNCE_MS } from '../utils/pagos-reports.util';
// #endregion

type MatrizResult = { status: 'ok'; data: MesesPagados } | { status: 'sin-alumnos' } | { status: 'error' };

/**
 * Estado y consultas de «Meses pagados». Se provee a nivel de componente.
 * - Una consulta por pausa de escritura (política `reports`); `switchMap` descarta la respuesta de un salón o fecha viejos.
 * - Sin reintentos: 4xx/429 nunca se reintentan; el usuario reintenta a mano.
 * - El BE exige `salonId`, así que los salones salen del listado del año (como «Generar cargos») y se elige el primero.
 */
@Injectable()
export class MesesPagadosFacade {
	private readonly api = inject(PagosApiService);
	private readonly salonesApi = inject(ClassroomsAdminApiService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly request$ = new Subject<MesesPagadosFiltros>();
	private readonly search$ = new Subject<string>();

	readonly hoy = toIsoLocal(new Date());
	readonly anio = Number(this.hoy.slice(0, 4));

	/** `HOY` o la fecha ISO de un corte; es lo que muestra el selector compartido. */
	readonly seleccion = signal<string>(HOY);
	readonly salonId = signal<number | null>(null);
	readonly buscar = signal('');

	readonly opciones = signal<OpcionSalon[]>([]);
	readonly cortes = signal<PagoCorte[]>([]);
	readonly data = signal<MesesPagados | null>(null);
	readonly loading = signal(false);
	readonly error = signal(false);
	readonly sinAlumnos = signal(false);
	readonly salonesError = signal(false);
	readonly exporting = signal(false);
	readonly exportError = signal(false);

	readonly fechaFoto = computed<string | null>(() => (this.seleccion() === HOY ? null : this.seleccion()));
	readonly filas = computed(() => this.data()?.filas ?? []);

	constructor() {
		this.request$
			.pipe(
				tap(() => {
					this.loading.set(true);
					this.error.set(false);
					this.sinAlumnos.set(false);
				}),
				switchMap((filtros) =>
					this.api.mesesPagados(filtros).pipe(
						map((data): MatrizResult => ({ status: 'ok', data })),
						catchError((err: unknown) => {
							if (err instanceof HttpErrorResponse && err.status === 404) {
								return of<MatrizResult>({ status: 'sin-alumnos' });
							}
							logger.error('[MesesPagadosFacade] Error al cargar meses pagados', err);
							return of<MatrizResult>({ status: 'error' });
						}),
					),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				this.loading.set(false);
				this.data.set(result.status === 'ok' ? result.data : null);
				this.sinAlumnos.set(result.status === 'sin-alumnos');
				this.error.set(result.status === 'error');
			});

		this.search$
			.pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
			.subscribe((text) => {
				this.buscar.set(text);
				this.reload();
			});

		this.cargarSalones();
		this.cargarCortes();
	}

	setSeleccion(value: string): void {
		this.seleccion.set(value);
		this.reload();
	}

	setSalon(salonId: number | null): void {
		this.salonId.set(salonId);
		this.reload();
	}

	/** Entrada de texto cruda: se consulta una sola vez tras la pausa. */
	onSearchInput(text: string): void {
		this.search$.next(text.trim());
	}

	reload(): void {
		const filtros = this.filtros();
		if (filtros) this.request$.next(filtros);
	}

	/** Descarga el Excel con los mismos filtros de la pantalla. */
	exportExcel(): void {
		const filtros = this.filtros();
		if (!filtros || this.exporting()) return;
		this.exporting.set(true);
		this.exportError.set(false);
		this.api.mesesPagadosExcel(filtros).subscribe({
			next: ({ blob, fileName }) => {
				downloadBlob(blob, fileName);
				this.exporting.set(false);
			},
			error: (err: unknown) => {
				logger.error('[MesesPagadosFacade] Error al exportar a Excel', err);
				this.exporting.set(false);
				this.exportError.set(true);
			},
		});
	}

	private filtros(): MesesPagadosFiltros | null {
		const salonId = this.salonId();
		if (salonId === null) return null;
		return { salonId, fecha: this.fechaFoto(), buscar: this.buscar() };
	}

	private cargarSalones(): void {
		this.salonesApi
			.getSalonesAdmin(this.anio, false)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (lista) => {
					// «Todos los salones» no aplica acá: el BE pide un salón concreto.
					const opciones = opcionesSalon(lista).filter((o) => o.salonId !== null);
					this.opciones.set(opciones);
					this.setSalon(opciones[0]?.salonId ?? null);
				},
				error: (err: unknown) => {
					logger.error('[MesesPagadosFacade] Error al cargar los salones', err);
					this.salonesError.set(true);
				},
			});
	}

	private cargarCortes(): void {
		this.api
			.cortes(this.anio)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (list) => this.cortes.set(list),
				error: (err: unknown) => logger.error('[MesesPagadosFacade] Error al cargar los cortes', err),
			});
	}
}
