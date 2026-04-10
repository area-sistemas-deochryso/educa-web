import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';

import { ErrorOrigen, ErrorSeveridad, ErrorLogLista } from '../models';
import { ErrorLogsService } from './error-logs.service';
import { ErrorLogsStore } from './error-logs.store';

@Injectable({ providedIn: 'root' })
export class ErrorLogsFacade {
	// #region Dependencias
	private readonly api = inject(ErrorLogsService);
	private readonly store = inject(ErrorLogsStore);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Carga de datos
	loadData(): void {
		if (this.store.loading()) return;
		this.store.setLoading(true);

		this.api
			.getErrores(
				this.store.filterOrigen(),
				this.store.filterSeveridad(),
				this.store.page(),
				this.store.pageSize(),
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setItems(items);
					this.store.setTableReady(true);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('[ErrorLogsFacade] Error al cargar errores:', err);
					this.store.setLoading(false);
					this.store.setTableReady(true);
				},
			});
	}

	refresh(): void {
		this.store.setPage(1);
		this.loadData();
	}
	// #endregion

	// #region Filtros
	setFilterOrigen(origen: ErrorOrigen | null): void {
		this.store.setFilterOrigen(origen);
		this.store.setPage(1);
		this.loadData();
	}

	setFilterSeveridad(severidad: ErrorSeveridad | null): void {
		this.store.setFilterSeveridad(severidad);
		this.store.setPage(1);
		this.loadData();
	}

	loadPage(page: number): void {
		this.store.setPage(page);
		this.loadData();
	}
	// #endregion

	// #region Drawer — detalle completo del error
	openDetail(item: ErrorLogLista): void {
		this.store.openDrawer(item);
		this.loadCompleto(item.id);
	}

	closeDrawer(): void {
		this.store.closeDrawer();
	}

	private loadCompleto(errorId: number): void {
		this.store.setDetallesLoading(true);

		this.api
			.getCompleto(errorId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (error) => {
					this.store.setErrorCompleto(error);
					this.store.setDetallesLoading(false);
				},
				error: () => this.store.setDetallesLoading(false),
			});
	}
	// #endregion
}
