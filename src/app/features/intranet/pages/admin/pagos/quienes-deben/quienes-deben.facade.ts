// #region Imports
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

import { downloadBlob, logger } from '@core/helpers';
import type { PagosSalonOpcion, QuienesDeben, QuienesDebenFiltros, QuienesDebenOrden } from '@data/models';
import { PagosApiService } from '../services/pagos-api.service';
// #endregion

export const SEARCH_DEBOUNCE_MS = 300;
export const DEFAULT_PAGE_SIZE = 20;

type DebenResult = { ok: true; data: QuienesDeben } | { ok: false };

/**
 * Estado y consultas de «¿Quiénes deben?». Se provee a nivel de componente.
 * - Una consulta por pausa de escritura (política `reports` del BE); `switchMap` cancela la anterior.
 * - Cualquier cambio de fecha/búsqueda/salón/orden vuelve a la página 1.
 * - Sin reintentos: 4xx/429 nunca se reintentan; el usuario reintenta a mano.
 */
@Injectable()
export class QuienesDebenFacade {
	private readonly api = inject(PagosApiService);
	private readonly destroyRef = inject(DestroyRef);

	private readonly request$ = new Subject<QuienesDebenFiltros>();
	private readonly search$ = new Subject<string>();

	readonly fecha = signal<string | null>(null);
	readonly buscar = signal('');
	readonly salonId = signal<number | null>(null);
	readonly orden = signal<QuienesDebenOrden | null>(null);
	readonly descendente = signal(false);
	readonly page = signal(1);
	readonly pageSize = signal(DEFAULT_PAGE_SIZE);

	readonly data = signal<QuienesDeben | null>(null);
	readonly salones = signal<PagosSalonOpcion[]>([]);
	readonly loading = signal(false);
	readonly error = signal(false);
	readonly exporting = signal(false);
	readonly exportError = signal(false);

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
					this.api.deben(filtros).pipe(
						map((data): DebenResult => ({ ok: true, data })),
						catchError((err: unknown) => {
							logger.error('[QuienesDebenFacade] Error al cargar quiénes deben', err);
							return of<DebenResult>({ ok: false });
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

	/** Cambia la fecha de la foto; vuelve a la página 1 y recarga. */
	setFecha(fecha: string | null): void {
		this.fecha.set(fecha);
		this.reloadFromFirstPage();
	}

	/** Entrada de texto cruda: se consulta una sola vez tras la pausa. */
	onSearchInput(text: string): void {
		this.search$.next(text.trim());
	}

	setSalon(salonId: number | null): void {
		this.salonId.set(salonId);
		this.reloadFromFirstPage();
	}

	/** Alterna asc → desc → sin orden (el servidor ordena por mayor deuda). */
	toggleSort(orden: QuienesDebenOrden): void {
		if (this.orden() !== orden) {
			this.orden.set(orden);
			this.descendente.set(false);
		} else if (!this.descendente()) {
			this.descendente.set(true);
		} else {
			this.orden.set(null);
			this.descendente.set(false);
		}
		this.reloadFromFirstPage();
	}

	setPage(page: number, pageSize: number): void {
		this.page.set(page);
		this.pageSize.set(pageSize);
		this.reload();
	}

	reload(): void {
		this.request$.next(this.filtros(true));
	}

	/** Descarga el Excel con los mismos filtros de la pantalla, sin paginar. */
	exportExcel(): void {
		if (this.exporting()) return;
		this.exporting.set(true);
		this.exportError.set(false);
		this.api.debenExcel(this.filtros(false)).subscribe({
			next: ({ blob, fileName }) => {
				downloadBlob(blob, fileName);
				this.exporting.set(false);
			},
			error: (err: unknown) => {
				logger.error('[QuienesDebenFacade] Error al exportar a Excel', err);
				this.exporting.set(false);
				this.exportError.set(true);
			},
		});
	}

	private reloadFromFirstPage(): void {
		this.page.set(1);
		this.reload();
	}

	private filtros(paginated: boolean): QuienesDebenFiltros {
		const filtros: QuienesDebenFiltros = {
			fecha: this.fecha(),
			buscar: this.buscar(),
			salonId: this.salonId(),
			orden: this.orden(),
			descendente: this.descendente(),
		};
		return paginated ? { ...filtros, page: this.page(), pageSize: this.pageSize() } : filtros;
	}
}
