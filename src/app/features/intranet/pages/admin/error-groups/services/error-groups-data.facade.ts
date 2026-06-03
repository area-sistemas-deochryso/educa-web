import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { logger } from '@core/helpers';
import { WalCrossTabRefetchService } from '@core/services';

import { ErrorGroupTrendDto } from '../models';
import { ErrorGroupsService } from './error-groups.service';
import { ErrorGroupsStore } from './error-groups.store';

const TREND_MAX_CONCURRENT = 3;

@Injectable({ providedIn: 'root' })
export class ErrorGroupsDataFacade {
	// #region Dependencias
	private readonly api = inject(ErrorGroupsService);
	private readonly store = inject(ErrorGroupsStore);
	private readonly crossTabRefetch = inject(WalCrossTabRefetchService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Search debounce trigger
	private readonly searchTrigger$ = new Subject<string>();

	constructor() {
		this.searchTrigger$
			.pipe(
				debounceTime(300),
				distinctUntilChanged(),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((term) => {
				this.store.setSearchTerm(term);
				this.store.setPage(1);
				this.loadData();
			});

		this.crossTabRefetch.subscribe({
			resourceType: 'error-groups',
			refetchItems: () => this.loadData(),
			destroyRef: this.destroyRef,
		});
	}
	// #endregion

	// #region Listado + count
	loadData(): void {
		if (this.store.loading()) return;
		this.store.setLoading(true);

		this.api
			.getList(
				this.store.filterEstado(),
				this.store.filterSeveridad(),
				this.store.filterOrigen(),
				this.store.searchTerm() || null,
				this.store.page(),
				this.store.pageSize(),
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setGroups(items);
					this.store.setTableReady(true);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('[ErrorGroupsDataFacade] Error al cargar grupos:', err);
					this.store.setLoading(false);
					this.store.setTableReady(true);
				},
			});

		this.loadCount();
	}

	private loadCount(): void {
		this.api
			.getCount(
				this.store.filterEstado(),
				this.store.filterSeveridad(),
				this.store.filterOrigen(),
				this.store.searchTerm() || null,
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (count) => this.store.setTotalCount(count),
				error: (err) => {
					logger.warn('[ErrorGroupsDataFacade] Error al cargar count', err);
					this.store.setTotalCount(null);
				},
			});
	}

	loadPage(page: number): void {
		this.store.setPage(page);
		// Cambio de página NO recarga el count (mismos filtros).
		if (this.store.loading()) return;
		this.store.setLoading(true);
		this.api
			.getList(
				this.store.filterEstado(),
				this.store.filterSeveridad(),
				this.store.filterOrigen(),
				this.store.searchTerm() || null,
				this.store.page(),
				this.store.pageSize(),
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setGroups(items);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('[ErrorGroupsDataFacade] Error al cargar página:', err);
					this.store.setLoading(false);
				},
			});
	}

	refresh(): void {
		this.store.setPage(1);
		this.loadData();
	}
	// #endregion

	// #region Detalle del grupo
	loadGroupDetalle(id: number): void {
		this.store.setDetalleLoading(true);
		this.store.setSelectedDetalle(null);
		this.api
			.getDetalle(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (detalle) => {
					this.store.setSelectedDetalle(detalle);
					this.store.setDetalleLoading(false);
				},
				error: (err) => {
					logger.error('[ErrorGroupsDataFacade] Error al cargar detalle:', err);
					this.store.setDetalleLoading(false);
				},
			});
	}

	/**
	 * Refetch del grupo después de un conflicto de RowVersion. Actualiza el
	 * item del listado con el rowVersion fresco y refresca el detalle si está
	 * abierto.
	 */
	refetchGroup(id: number): void {
		this.api
			.getDetalle(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (detalle) => {
					this.store.setSelectedDetalle(detalle);
					// Sync del listado con el rowVersion fresco
					this.store.updateGroupEstado(id, detalle.estado, {
						rowVersion: detalle.rowVersion,
					});
				},
				error: (err) => {
					logger.error('[ErrorGroupsDataFacade] Error al refetchear grupo:', err);
				},
			});
	}
	// #endregion

	// #region Ocurrencias del grupo
	loadOcurrencias(grupoId: number): void {
		this.store.setOcurrenciasLoading(true);
		this.api
			.getOcurrencias(
				grupoId,
				this.store.ocurrenciasPage(),
				this.store.ocurrenciasPageSize(),
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setOcurrencias(items);
					this.store.setOcurrenciasLoading(false);
				},
				error: (err) => {
					logger.error('[ErrorGroupsDataFacade] Error al cargar ocurrencias:', err);
					this.store.setOcurrenciasLoading(false);
				},
			});
	}

	loadOcurrenciasPage(grupoId: number, page: number): void {
		this.store.setOcurrenciasPage(page);
		this.loadOcurrencias(grupoId);
	}

	setOcurrenciasPageSize(grupoId: number, pageSize: number): void {
		this.store.setOcurrenciasPageSize(pageSize);
		this.store.setOcurrenciasPage(1);
		this.loadOcurrencias(grupoId);
	}
	// #endregion

	// #region Search trigger
	onSearchChange(term: string): void {
		this.searchTrigger$.next(term);
	}
	// #endregion

	// #region Heatmap (Plan 43 F5:5.2)
	loadHeatmap(): void {
		if (this.store.heatmapLoading()) return;
		this.store.setHeatmapLoading(true);
		const days = this.store.heatmapDays();
		const endDate = this.store.heatmapEndDate();
		const endDateParam = endDate ? endDate.toISOString().slice(0, 10) : undefined;

		if (days === 30) {
			this.api
				.getHeatmapCalendar(days, endDateParam)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe({
					next: (cells) => {
						this.store.setHeatmapCalendarCells(cells);
						this.store.setHeatmapCells([]);
						this.store.setHeatmapLoading(false);
					},
					error: (err) => {
						logger.warn('[ErrorGroupsDataFacade] Heatmap calendar no disponible', err);
						this.store.setHeatmapCalendarCells([]);
						this.store.setHeatmapLoading(false);
					},
				});
		} else {
			this.api
				.getHeatmap(days, endDateParam)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe({
					next: (cells) => {
						this.store.setHeatmapCells(cells);
						this.store.setHeatmapCalendarCells([]);
						this.store.setHeatmapLoading(false);
					},
					error: (err) => {
						logger.warn('[ErrorGroupsDataFacade] Heatmap no disponible', err);
						this.store.setHeatmapCells([]);
						this.store.setHeatmapLoading(false);
					},
				});
		}
	}

	setHeatmapPeriod(days: 7 | 30): void {
		this.store.setHeatmapDays(days);
		this.loadHeatmap();
	}

	setHeatmapEndDate(date: Date | null): void {
		this.store.setHeatmapEndDate(date);
		this.loadHeatmap();
	}
	// #endregion

	// #region Event view (Plan 45 F2.2)
	loadEventData(): void {
		if (this.store.eventLoading()) return;
		this.store.setEventLoading(true);

		this.api
			.getErrorList(
				this.store.filterOrigen(),
				this.store.filterSeveridad(),
				null,
				this.store.eventPage(),
				this.store.eventPageSize(),
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setEventItems(items);
					this.store.setEventLoading(false);
				},
				error: (err) => {
					logger.error('[ErrorGroupsDataFacade] Error al cargar eventos:', err);
					this.store.setEventLoading(false);
				},
			});

		this.api
			.getErrorCount(
				this.store.filterOrigen(),
				this.store.filterSeveridad(),
				null,
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (count) => this.store.setEventTotalCount(count),
				error: () => this.store.setEventTotalCount(null),
			});
	}

	loadEventPage(page: number): void {
		this.store.setEventPage(page);
		if (this.store.eventLoading()) return;
		this.store.setEventLoading(true);
		this.api
			.getErrorList(
				this.store.filterOrigen(),
				this.store.filterSeveridad(),
				null,
				this.store.eventPage(),
				this.store.eventPageSize(),
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setEventItems(items);
					this.store.setEventLoading(false);
				},
				error: (err) => {
					logger.error('[ErrorGroupsDataFacade] Error al cargar eventos página:', err);
					this.store.setEventLoading(false);
				},
			});
	}
	// #endregion

	// #region Trend 30d (Plan 43 Chat 1.2)
	private readonly trendQueue: number[] = [];
	private trendInFlight = 0;

	/**
	 * Solicita el trend de un grupo. Idempotente: si ya hay cache (loading,
	 * loaded o error), no relanza. Limita concurrencia a `TREND_MAX_CONCURRENT`
	 * para no saturar BE — el resto entra a cola y se despacha al liberar slot.
	 */
	requestTrend(grupoId: number): void {
		if (this.store.getTrendEntry(grupoId)) return;
		this.store.setTrendStatus(grupoId, 'loading');
		this.trendQueue.push(grupoId);
		this.drainTrendQueue();
	}

	private drainTrendQueue(): void {
		while (this.trendInFlight < TREND_MAX_CONCURRENT && this.trendQueue.length > 0) {
			const grupoId = this.trendQueue.shift()!;
			this.fetchTrendNow(grupoId);
		}
	}

	private fetchTrendNow(grupoId: number): void {
		this.trendInFlight++;
		this.api
			.getTrend(grupoId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (trend: ErrorGroupTrendDto[]) => {
					this.store.setTrendStatus(
						grupoId,
						'loaded',
						(trend ?? []).map((p) => p.count),
					);
					this.trendInFlight--;
					this.drainTrendQueue();
				},
				error: (err) => {
					logger.warn(`[ErrorGroupsDataFacade] Trend ${grupoId} no disponible`, err);
					this.store.setTrendStatus(grupoId, 'error', []);
					this.trendInFlight--;
					this.drainTrendQueue();
				},
			});
	}
	// #endregion
}
