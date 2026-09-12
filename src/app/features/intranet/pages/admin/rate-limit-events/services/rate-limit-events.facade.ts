import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, Subject, switchMap } from 'rxjs';

import { downloadBlob, logger, resolveErrorMessage } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';

import {
	DEFAULT_STATS_HORAS,
	RateLimitEventFiltro,
	RateLimitEventListaDto,
} from '../models';
import { RateLimitEventsService } from './rate-limit-events.service';
import { RateLimitEventsStore } from './rate-limit-events.store';

@Injectable({ providedIn: 'root' })
export class RateLimitEventsFacade {
	// #region Dependencias
	private readonly api = inject(RateLimitEventsService);
	private readonly store = inject(RateLimitEventsStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	private readonly loadEventos$ = new Subject<void>();
	private readonly loadStats$ = new Subject<number>();

	constructor() {
		this.loadEventos$
			.pipe(
				switchMap(() => {
					const filter = this.store.filter();
					const page = this.store.page();
					const pageSize = this.store.pageSize();
					return this.api.listar({ ...filter, page, pageSize }).pipe(
						catchError((err) => {
							logger.error('[RateLimitEventsFacade] Error al cargar eventos:', err);
							this.store.setError('No se pudieron cargar los eventos');
							this.store.setTableReady(true);
							this.store.setLoading(false);
							return of(null);
						}),
					);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				if (!result) return;
				this.store.setItems(result.data);
				this.store.setPaginationData(result.page, result.pageSize, result.total);
				this.store.setTableReady(true);
				this.store.setLoading(false);
			});

		this.loadStats$
			.pipe(
				switchMap((horas) =>
					this.api.getStats(horas).pipe(
						catchError((err) => {
							logger.error('[RateLimitEventsFacade] Error al cargar stats:', err);
							this.store.setStats(null);
							this.store.setLoadingStats(false);
							return of(null);
						}),
					),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((stats) => {
				if (stats === null) return;
				this.store.setStats(stats);
				this.store.setLoadingStats(false);
			});
	}

	// #region Carga inicial
	loadData(): void {
		this.loadStats();
		this.loadEventos();
	}

	refresh(): void {
		this.loadData();
	}
	// #endregion

	// #region Carga de eventos (lista)
	private loadEventos(): void {
		this.store.setLoading(true);
		this.store.setError(null);
		this.loadEventos$.next();
	}

	/** Handler del `p-table` lazy — convierte `first`/`rows` de PrimeNG a `page`/`pageSize`. */
	loadPage(page: number, pageSize: number): void {
		this.store.setPageSize(pageSize);
		this.store.setPage(page);
		this.loadEventos();
	}
	// #endregion

	// #region Carga de stats agregados
	private loadStats(horas: number = DEFAULT_STATS_HORAS): void {
		this.store.setLoadingStats(true);
		this.loadStats$.next(horas);
	}
	// #endregion

	// #region Filtros
	updateFilter(partial: Partial<RateLimitEventFiltro>): void {
		this.store.setFilter(partial);
		this.store.setPage(1);
		this.loadEventos();
	}

	clearFilters(): void {
		this.store.resetFilter();
		this.loadEventos();
	}
	// #endregion

	// #region Exportar CSV
	exportarCsv(): void {
		const filter = this.store.filter();
		this.api
			.exportarCsv(filter)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blob) => {
					const fecha = new Date().toISOString().split('T')[0];
					downloadBlob(blob, `rate-limit-events-${fecha}.csv`);
				},
				error: (err) => {
					logger.error('[RateLimitEventsFacade] Error exportando CSV', err);
					this.errorHandler.showError(
						'No se pudo exportar',
						resolveErrorMessage(err, 'Ocurrió un error al generar el archivo CSV.'),
					);
				},
			});
	}
	// #endregion

	// #region Drawer
	openDetail(item: RateLimitEventListaDto): void {
		this.store.openDrawer(item);
	}

	closeDrawer(): void {
		this.store.closeDrawer();
	}
	// #endregion
}
