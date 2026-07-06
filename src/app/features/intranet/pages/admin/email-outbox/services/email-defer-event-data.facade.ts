import { DestroyRef, Injectable, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger, toLocalIso } from '@core/helpers';
import { DeferEventTipo, EmailDeferEventFiltros } from '@data/models';
import { UiMappingService } from '@intranet-shared/services';

import { EmailDeferEventsService } from './email-defer-events.service';
import { EmailDeferEventStore } from './email-defer-event.store';

@Injectable({ providedIn: 'root' })
export class EmailDeferEventDataFacade {
	// #region Dependencias
	private readonly api = inject(EmailDeferEventsService);
	private readonly store = inject(EmailDeferEventStore);
	private readonly uiMapping = inject(UiMappingService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		events: this.store.items(),
		loading: this.store.loading(),
		page: this.store.page(),
		pageSize: this.store.pageSize(),
		total: this.store.total(),
		first: this.store.first(),
		hasEvents: this.store.itemCount() > 0,
		filterTipo: this.store.filterTipo(),
		filterDominio: this.store.filterDominio(),
		filterDesde: this.store.filterDesde(),
		filterHasta: this.store.filterHasta(),
		tipoOptions: this.store.tipoOptions(),
		tipoOptionsLoading: this.store.tipoOptionsLoading(),
		trend: this.store.trend(),
		trendLoading: this.store.trendLoading(),
	}));
	// #endregion

	// #region Listado paginado
	private getFiltros(): EmailDeferEventFiltros {
		return {
			desde: this.store.filterDesde() ? toLocalIso(this.store.filterDesde()!) : null,
			hasta: this.store.filterHasta() ? toLocalIso(this.store.filterHasta()!) : null,
			tipo: this.store.filterTipo(),
			dominio: this.store.filterDominio() || null,
		};
	}

	loadData(): void {
		if (this.store.loading()) return;
		this.store.setLoading(true);

		this.api
			.getPaginado(this.getFiltros(), this.store.page(), this.store.pageSize())
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.store.setItems(result.data);
					this.store.setPagination(result.page, result.pageSize, result.total);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('[EmailDeferEventDataFacade] Error al cargar listado', err);
					this.store.setLoading(false);
				},
			});
	}

	loadPage(page: number): void {
		this.store.setPage(page);
		this.loadData();
	}

	refresh(): void {
		this.loadData();
	}
	// #endregion

	// #region Filtros (UI handlers)
	onFilterTipoChange(tipo: DeferEventTipo | null): void {
		this.store.setFilterTipo(tipo);
		this.store.setPage(1);
		this.loadData();
	}

	onFilterDominioChange(dominio: string): void {
		this.store.setFilterDominio(dominio);
	}

	onFilterDominioApply(): void {
		this.store.setPage(1);
		this.loadData();
	}

	onFilterDesdeChange(desde: Date | null): void {
		this.store.setFilterDesde(desde);
		this.store.setPage(1);
		this.loadData();
	}

	onFilterHastaChange(hasta: Date | null): void {
		this.store.setFilterHasta(hasta);
		this.store.setPage(1);
		this.loadData();
	}

	clearFiltros(): void {
		this.store.clearFiltros();
		this.loadData();
	}
	// #endregion

	// #region Catálogo de tipos
	loadCatalogoTipos(): void {
		this.api
			.getCatalogoTipos()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (tipos) => {
					this.store.setTipoOptions(
						tipos.map((t) => ({
							label: this.uiMapping.getDeferEventTipoLabel(t),
							value: t,
						})),
					);
				},
				error: (err) => {
					logger.error('[EmailDeferEventDataFacade] Error loading catálogo tipos', err);
					// Fallback: dropdown vacío. El filtro tipo es string libre, sigue
					// funcionando vía URL (?tipo=...). Ver brief 117b.
					this.store.setTipoOptions([]);
				},
			});
	}
	// #endregion

	// #region Trend (30d sparkline)
	loadTrend(): void {
		if (this.store.trendLoading()) return;
		this.store.setTrendLoading(true);
		this.api
			.getTrend()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.store.setTrend(data);
					this.store.setTrendLoading(false);
				},
				error: () => {
					this.store.setTrendLoading(false);
				},
			});
	}
	// #endregion
}
