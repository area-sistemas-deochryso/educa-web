// #region Imports
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

import { logger } from '@core/helpers';
import type {
	CargoSinMatriculaFila,
	CargosSinMatricula,
	ConsistenciaFiltros,
	MatriculadoSinCargoFila,
	MatriculadosSinCargo,
	PagosSalonOpcion,
} from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../utils/pagos-reports.util';
// #endregion

export type ConsistenciaVista = 'sin-cargo' | 'sin-matricula';

type Resultado =
	| { ok: true; vista: 'sin-cargo'; data: MatriculadosSinCargo }
	| { ok: true; vista: 'sin-matricula'; data: CargosSinMatricula }
	| { ok: false };

/**
 * Estado del reporte de consistencia matrícula ↔ cobro (P123 F5). Se provee a nivel de componente.
 * Dos listas, una a la vez: «matriculados sin cargo» (con filtro de salón) y «cargos sin matrícula» (sin salón: por
 * definición no tienen). Solo informa; no bloquea matrícula ni cobro.
 * - Política `reports`: una consulta por pausa de escritura; `switchMap` cancela la anterior (también al cambiar de lista).
 * - Cualquier cambio de lista, búsqueda o salón vuelve a la página 1. Sin reintentos (4xx/429 nunca).
 * - Sin `anio` el servidor usa el de hoy; el año que devuelve es el que se usa para generar cargos.
 */
@Injectable()
export class ConsistenciaFacade {
	private readonly api = inject(PagosApiService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly request$ = new Subject<{ vista: ConsistenciaVista; filtros: ConsistenciaFiltros }>();
	private readonly search$ = new Subject<string>();

	readonly vista = signal<ConsistenciaVista>('sin-cargo');
	readonly buscar = signal('');
	readonly salonId = signal<number | null>(null);
	readonly page = signal(1);
	readonly pageSize = signal(DEFAULT_PAGE_SIZE);

	readonly sinCargo = signal<MatriculadosSinCargo | null>(null);
	readonly sinMatricula = signal<CargosSinMatricula | null>(null);
	readonly salones = signal<PagosSalonOpcion[]>([]);
	readonly loading = signal(false);
	readonly error = signal(false);

	/** La lista de la vista activa; `null` mientras no llegó su primera respuesta. */
	readonly cargada = computed(() => (this.vista() === 'sin-cargo' ? this.sinCargo() : this.sinMatricula()));
	readonly anio = computed(() => this.sinCargo()?.anio ?? this.sinMatricula()?.anio ?? null);
	readonly filasSinCargo = computed<MatriculadoSinCargoFila[]>(() => this.sinCargo()?.filas.data ?? []);
	readonly filasSinMatricula = computed<CargoSinMatriculaFila[]>(() => this.sinMatricula()?.filas.data ?? []);
	readonly total = computed(() => this.cargada()?.filas.total ?? 0);
	readonly first = computed(() => (this.page() - 1) * this.pageSize());
	readonly hasFilters = computed(
		() => this.buscar().trim() !== '' || (this.vista() === 'sin-cargo' && this.salonId() !== null),
	);

	constructor() {
		this.request$
			.pipe(
				tap(() => {
					this.loading.set(true);
					this.error.set(false);
				}),
				switchMap(({ vista, filtros }) => this.consultar(vista, filtros)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				this.loading.set(false);
				if (!result.ok) {
					this.error.set(true);
					return;
				}
				if (result.vista === 'sin-cargo') {
					this.sinCargo.set(result.data);
					if (result.data.salones.length > 0) this.salones.set(result.data.salones);
				} else {
					this.sinMatricula.set(result.data);
				}
			});

		this.search$
			.pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
			.subscribe((text) => {
				this.buscar.set(text);
				this.reloadFromFirstPage();
			});
	}

	/** Entrada de texto cruda: se consulta una sola vez tras la pausa. */
	onSearchInput(text: string): void {
		this.search$.next(text.trim());
	}

	setVista(vista: ConsistenciaVista): void {
		if (vista === this.vista()) return;
		this.vista.set(vista);
		this.reloadFromFirstPage();
	}

	setSalon(salonId: number | null): void {
		this.salonId.set(salonId);
		this.reloadFromFirstPage();
	}

	setPage(page: number, pageSize: number): void {
		this.page.set(page);
		this.pageSize.set(pageSize);
		this.reload();
	}

	reload(): void {
		const vista = this.vista();
		this.request$.next({
			vista,
			filtros: {
				buscar: this.buscar(),
				salonId: vista === 'sin-cargo' ? this.salonId() : null,
				page: this.page(),
				pageSize: this.pageSize(),
			},
		});
	}

	private reloadFromFirstPage(): void {
		this.page.set(1);
		this.reload();
	}

	private consultar(vista: ConsistenciaVista, filtros: ConsistenciaFiltros): Observable<Resultado> {
		const falla = (err: unknown): Observable<Resultado> => {
			logger.error('[ConsistenciaFacade] Error al cargar el reporte de consistencia', err);
			return of<Resultado>({ ok: false });
		};
		return vista === 'sin-cargo'
			? this.api.matriculadosSinCargo(filtros).pipe(
					map((data): Resultado => ({ ok: true, vista: 'sin-cargo', data })),
					catchError(falla),
				)
			: this.api.cargosSinMatricula(filtros).pipe(
					map((data): Resultado => ({ ok: true, vista: 'sin-matricula', data })),
					catchError(falla),
				);
	}
}
