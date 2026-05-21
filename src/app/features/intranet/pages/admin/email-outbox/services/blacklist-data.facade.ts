import { DestroyRef, Injectable, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { logger } from '@core/helpers';
import { WalCrossTabRefetchService } from '@core/services';
import {
	BlacklistFiltros,
	EmailBlacklistFiltroEstado,
	EmailBlacklistMotivo,
} from '@data/models';

import { BlacklistService } from './blacklist.service';
import { BlacklistStore } from './blacklist.store';

@Injectable({ providedIn: 'root' })
export class BlacklistDataFacade {
	// #region Dependencias
	private readonly api = inject(BlacklistService);
	private readonly store = inject(BlacklistStore);
	private readonly crossTabRefetch = inject(WalCrossTabRefetchService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

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
		filterEstado: this.store.filterEstadoBlacklist(),
		hasActiveFilters: this.store.hasActiveFilters(),
		estadisticas: this.store.estadisticas(),
		dialogVisible: this.store.dialogVisible(),
		drawerVisible: this.store.drawerVisible(),
		drawerItem: this.store.drawerItem(),
		formData: this.store.formData(),
	}));
	// #endregion

	// #region Search debounce trigger
	private readonly searchTrigger$ = new Subject<string>();

	constructor() {
		this.searchTrigger$
			.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
			.subscribe((term) => {
				this.store.setSearchTerm(term);
				this.store.setPage(1);
				this.loadData();
			});

		this.crossTabRefetch.subscribe({
			resourceType: 'email-blacklist',
			refetchItems: () => this.loadData(),
			destroyRef: this.destroyRef,
		});
	}
	// #endregion

	// #region Listado paginado
	private getFiltros(): BlacklistFiltros {
		return {
			estado: this.store.filterEstadoBlacklist(),
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
					logger.error('[BlacklistDataFacade] Error al cargar listado', err);
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

	// #region Filtros (UI handlers)
	onSearchChange(term: string): void {
		this.searchTrigger$.next(term);
	}

	onFilterMotivoChange(motivo: EmailBlacklistMotivo | null): void {
		this.store.setFilterMotivo(motivo);
		this.store.setPage(1);
		this.loadData();
	}

	onFilterEstadoChange(estado: EmailBlacklistFiltroEstado | null): void {
		this.store.setFilterEstadoBlacklist(estado);
		this.store.setPage(1);
		this.loadData();
	}

	clearFiltros(): void {
		this.store.clearFiltros();
		this.loadData();
	}
	// #endregion

	// #region Estadísticas derivadas
	/**
	 * El BE no expone aggregations dedicadas. Si la página actual NO está filtrada
	 * por estado, podemos derivar `activas` con `data.filter(e.estado).length`
	 * en la página visible — pero como el listado puede tener N páginas, eso miente.
	 * Implementamos algo honesto: `total` es el total real (count del wrapper), y
	 * `activas/inactivas` se aproximan según el filtro actual:
	 *   - filterEstado='activa'   → activas=total, inactivas=0
	 *   - filterEstado='inactiva' → activas=0, inactivas=total
	 *   - filterEstado=null       → activas=undefined visualmente (header oculta esa card)
	 *
	 * Para el v1 mostramos solo `total` real y un breakdown best-effort sobre la
	 * página visible. Mejorable cuando el BE exponga `/stats`.
	 */
	private deriveStats(total: number, items: readonly { estado: boolean }[]) {
		const filterEstado = this.store.filterEstadoBlacklist();
		if (filterEstado === 'activa') return { total, activas: total, inactivas: 0 };
		if (filterEstado === 'inactiva') return { total, activas: 0, inactivas: total };
		const activasEnPagina = items.filter((i) => i.estado).length;
		const ratio = items.length > 0 ? activasEnPagina / items.length : 0;
		const activas = Math.round(total * ratio);
		return { total, activas, inactivas: Math.max(0, total - activas) };
	}
	// #endregion

	// #region Form data (dialog "Agregar")
	updateFormCorreo(value: string): void {
		this.store.updateFormField('correo', value);
	}

	updateFormMotivo(value: EmailBlacklistMotivo | null): void {
		this.store.updateFormField('motivo', value);
	}

	updateFormObservacion(value: string): void {
		this.store.updateFormField('observacion', value);
	}
	// #endregion
}
