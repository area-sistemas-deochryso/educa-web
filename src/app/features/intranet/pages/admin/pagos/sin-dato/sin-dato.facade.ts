// #region Imports
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

import { logger } from '@core/helpers';
import type { PagosSalonOpcion, SinDato, SinDatoFiltros } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../utils/pagos-reports.util';
// #endregion

type SinDatoResult = { ok: true; data: SinDato } | { ok: false };

/**
 * Estado de «Sin dato» (INV-PG14: vista aparte, nunca dentro de «¿Quiénes deben?»). Se provee a nivel de componente.
 * - Política `reports`: una consulta por pausa de escritura; `switchMap` cancela la anterior.
 * - Cualquier cambio de búsqueda o salón vuelve a la página 1.
 * - Sin reintentos: 4xx/429 nunca se reintentan. El servidor no ordena por columna: solo pagina.
 */
@Injectable()
export class SinDatoFacade {
	private readonly api = inject(PagosApiService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly request$ = new Subject<SinDatoFiltros>();
	private readonly search$ = new Subject<string>();

	readonly buscar = signal('');
	readonly salonId = signal<number | null>(null);
	readonly page = signal(1);
	readonly pageSize = signal(DEFAULT_PAGE_SIZE);

	readonly data = signal<SinDato | null>(null);
	readonly salones = signal<PagosSalonOpcion[]>([]);
	readonly loading = signal(false);
	readonly error = signal(false);

	readonly filas = computed(() => this.data()?.filas.data ?? []);
	readonly total = computed(() => this.data()?.filas.total ?? 0);
	readonly first = computed(() => (this.page() - 1) * this.pageSize());
	readonly hasFilters = computed(() => this.buscar().trim() !== '' || this.salonId() !== null);

	constructor() {
		this.request$
			.pipe(
				tap(() => {
					this.loading.set(true);
					this.error.set(false);
				}),
				switchMap((filtros) =>
					this.api.sinDato(filtros).pipe(
						map((data): SinDatoResult => ({ ok: true, data })),
						catchError((err: unknown) => {
							logger.error('[SinDatoFacade] Error al cargar los cargos sin dato', err);
							return of<SinDatoResult>({ ok: false });
						}),
					),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				this.loading.set(false);
				if (!result.ok) {
					this.error.set(true);
					return;
				}
				this.data.set(result.data);
				if (result.data.salones.length > 0) this.salones.set(result.data.salones);
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
		this.request$.next({
			buscar: this.buscar(),
			salonId: this.salonId(),
			page: this.page(),
			pageSize: this.pageSize(),
		});
	}

	private reloadFromFirstPage(): void {
		this.page.set(1);
		this.reload();
	}
}
