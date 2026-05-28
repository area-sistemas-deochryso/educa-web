import { DestroyRef, Injectable, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { logger } from '@core/helpers';
import { WalCrossTabRefetchService } from '@core/services';
import {
	EmailQuarantineFiltroEstado,
	EmailQuarantineFiltros,
	QuarantineMotivo,
} from '@data/models';

import { EmailQuarantineService } from './email-quarantine.service';
import { EmailQuarantineStore } from './email-quarantine.store';

@Injectable({ providedIn: 'root' })
export class EmailQuarantineDataFacade {
	private readonly api = inject(EmailQuarantineService);
	private readonly store = inject(EmailQuarantineStore);
	private readonly crossTabRefetch = inject(WalCrossTabRefetchService);
	private readonly destroyRef = inject(DestroyRef);

	// #region ViewModel
	readonly vm = computed(() => ({
		items: this.store.items(),
		loading: this.store.loading(),
		tableReady: this.store.tableReady(),
		page: this.store.page(),
		pageSize: this.store.pageSize(),
		totalRecords: this.store.totalRecords(),
		searchTerm: this.store.searchTerm(),
		filterMotivo: this.store.filterMotivo(),
		filterEstado: this.store.filterEstadoQuarantine(),
		hasActiveFilters: this.store.hasActiveFilters(),
		estadisticas: this.store.estadisticas(),
		dialogVisible: this.store.dialogVisible(),
		drawerVisible: this.store.drawerVisible(),
		drawerItem: this.store.drawerItem(),
		drawerDetalle: this.store.drawerDetalle(),
		formData: this.store.formData(),
		trend: this.store.trend(),
		trendLoading: this.store.trendLoading(),
	}));
	// #endregion

	// #region Search debounce
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
			resourceType: 'email-quarantine',
			refetchItems: () => this.loadData(),
			destroyRef: this.destroyRef,
		});
	}
	// #endregion

	// #region Listado paginado
	private getFiltros(): EmailQuarantineFiltros {
		return {
			estado: this.store.filterEstadoQuarantine(),
			motivo: this.store.filterMotivo(),
			q: this.store.searchTerm() || null,
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
					this.store.setPaginationData(result.page, result.pageSize, result.total);
					this.store.setEstadisticas(this.deriveStats(result.total, result.data));
					this.store.setTableReady(true);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('[EmailQuarantineDataFacade] Error al cargar listado', err);
					this.store.setLoading(false);
					this.store.setTableReady(true);
				},
			});
	}

	loadPage(page: number, pageSize: number): void {
		this.store.setPageSize(pageSize);
		this.store.setPage(page);
		this.loadData();
	}

	refresh(): void {
		this.store.setPage(1);
		this.loadData();
	}
	// #endregion

	// #region Filtros UI
	onSearchChange(term: string): void {
		this.searchTrigger$.next(term);
	}

	onFilterMotivoChange(motivo: QuarantineMotivo | null): void {
		this.store.setFilterMotivo(motivo);
		this.store.setPage(1);
		this.loadData();
	}

	onFilterEstadoChange(estado: EmailQuarantineFiltroEstado | null): void {
		this.store.setFilterEstadoQuarantine(estado);
		this.store.setPage(1);
		this.loadData();
	}

	clearFiltros(): void {
		this.store.clearFiltros();
		this.loadData();
	}
	// #endregion

	// #region Stats best-effort
	private deriveStats(total: number, items: readonly { estado: boolean }[]) {
		const filterEstado = this.store.filterEstadoQuarantine();
		if (filterEstado === 'activa') return { total, activas: total, liberadas: 0 };
		if (filterEstado === 'liberada') return { total, activas: 0, liberadas: total };
		const activasEnPagina = items.filter((i) => i.estado).length;
		const ratio = items.length > 0 ? activasEnPagina / items.length : 0;
		const activas = Math.round(total * ratio);
		return { total, activas, liberadas: Math.max(0, total - activas) };
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

	// #region Form (dialog Agregar)
	updateFormDestinatario(value: string): void {
		this.store.updateFormField('destinatario', value);
	}

	updateFormDuration(value: 24 | 48 | 72): void {
		this.store.updateFormField('durationHours', value);
	}

	updateFormObservacion(value: string): void {
		this.store.updateFormField('observacion', value);
	}
	// #endregion
}
