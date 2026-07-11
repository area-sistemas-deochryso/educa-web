import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { downloadBlob, logger } from '@core/helpers';
import { WalCrossTabRefetchService } from '@core/services';

import { ErrorGroupsService } from './error-groups.service';
import { ErrorGroupsStore } from './error-groups.store';
import { ErrorGroupsTrendQueue } from './error-groups-trend-queue';
import { ErrorGroupsHeatmap } from './error-groups-heatmap';

@Injectable({ providedIn: 'root' })
export class ErrorGroupsDataFacade {
	// #region Dependencias
	private readonly api = inject(ErrorGroupsService);
	private readonly store = inject(ErrorGroupsStore);
	private readonly crossTabRefetch = inject(WalCrossTabRefetchService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly trendQueue = new ErrorGroupsTrendQueue(this.api, this.store, (source$) =>
		source$.pipe(takeUntilDestroyed(this.destroyRef)),
	);
	private readonly heatmap = new ErrorGroupsHeatmap(this.api, this.store, (source$) =>
		source$.pipe(takeUntilDestroyed(this.destroyRef)),
	);
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
				this.store.filterOcurrenciasMin(),
				this.store.excluirRuido(),
				this.store.sortField(),
				this.store.sortDireccion(),
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
				this.store.filterOcurrenciasMin(),
				this.store.excluirRuido(),
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
				this.store.filterOcurrenciasMin(),
				this.store.excluirRuido(),
				this.store.sortField(),
				this.store.sortDireccion(),
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

	exportarGrupos(): void {
		this.api
			.exportarGrupos(
				this.store.filterEstado(),
				this.store.filterSeveridad(),
				this.store.filterOrigen(),
				this.store.searchTerm() || null,
				this.store.filterOcurrenciasMin(),
				this.store.excluirRuido(),
				this.store.sortField(),
				this.store.sortDireccion(),
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blob) => {
					const fecha = new Date().toISOString().split('T')[0];
					downloadBlob(blob, `error-groups-${fecha}.csv`);
				},
				error: (err) => {
					logger.error('[ErrorGroupsDataFacade] Error exportando grupos CSV', err);
				},
			});
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

	exportarOcurrencias(grupoId: number): void {
		this.api
			.exportarOcurrencias(grupoId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blob) => {
					const fecha = new Date().toISOString().split('T')[0];
					downloadBlob(blob, `error-group-${grupoId}-ocurrencias-${fecha}.csv`);
				},
				error: (err) => {
					logger.error('[ErrorGroupsDataFacade] Error exportando ocurrencias CSV', err);
				},
			});
	}
	// #endregion

	// #region Search trigger
	onSearchChange(term: string): void {
		this.searchTrigger$.next(term);
	}
	// #endregion

	// #region Heatmap (Plan 43 F5:5.2)
	loadHeatmap(): void {
		this.heatmap.loadHeatmap();
	}

	setHeatmapPeriod(days: 7 | 30): void {
		this.heatmap.setHeatmapPeriod(days);
	}

	setHeatmapEndDate(date: Date | null): void {
		this.heatmap.setHeatmapEndDate(date);
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
	requestTrend(grupoId: number): void {
		this.trendQueue.requestTrend(grupoId);
	}
	// #endregion
}
