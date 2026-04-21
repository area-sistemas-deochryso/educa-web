import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';

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
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

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
		if (this.store.loading()) return;
		this.store.setLoading(true);
		this.store.setError(null);

		this.api
			.listar(this.store.filter())
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setItems(items);
					this.store.setTableReady(true);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('[RateLimitEventsFacade] Error al cargar eventos:', err);
					this.store.setError('No se pudieron cargar los eventos');
					this.store.setTableReady(true);
					this.store.setLoading(false);
				},
			});
	}
	// #endregion

	// #region Carga de stats agregados
	private loadStats(horas: number = DEFAULT_STATS_HORAS): void {
		if (this.store.loadingStats()) return;
		this.store.setLoadingStats(true);

		this.api
			.getStats(horas)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (stats) => {
					this.store.setStats(stats);
					this.store.setLoadingStats(false);
				},
				error: (err) => {
					logger.error('[RateLimitEventsFacade] Error al cargar stats:', err);
					this.store.setStats(null);
					this.store.setLoadingStats(false);
				},
			});
	}
	// #endregion

	// #region Filtros
	updateFilter(partial: Partial<RateLimitEventFiltro>): void {
		this.store.setFilter(partial);
		this.loadEventos();
	}

	clearFilters(): void {
		this.store.resetFilter();
		this.loadEventos();
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
