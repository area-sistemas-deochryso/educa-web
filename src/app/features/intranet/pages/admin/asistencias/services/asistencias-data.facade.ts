import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';
import { AsistenciasAdminService } from './asistencias-admin.service';
import { AsistenciasAdminStore } from './asistencias-admin.store';

@Injectable({ providedIn: 'root' })
export class AsistenciasDataFacade {
	// #region Dependencias
	private api = inject(AsistenciasAdminService);
	private store = inject(AsistenciasAdminStore);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Carga de datos

	loadData(): void {
		this.loadEstadisticas();
		this.loadItems();
	}

	loadEstadisticas(): void {
		const fecha = this.store.fecha();
		const sedeId = this.store.sedeId() ?? undefined;

		this.api
			.obtenerEstadisticas(fecha, sedeId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (stats) => {
					if (stats) this.store.setEstadisticas(stats);
					this.store.setStatsReady(true);
				},
				error: () => {
					this.store.setStatsReady(true);
				},
			});
	}

	loadItems(): void {
		if (this.store.loading()) return;
		this.store.setLoading(true);

		const fecha = this.store.fecha();
		const sedeId = this.store.sedeId() ?? undefined;

		this.api
			.listarDelDia(fecha, sedeId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setItems(items ?? []);
					this.store.setTableReady(true);
					this.store.setLoading(false);
				},
				error: () => {
					this.store.setItems([]);
					this.store.setTableReady(true);
					this.store.setLoading(false);
				},
			});
	}

	refreshItemsOnly(): void {
		const fecha = this.store.fecha();
		const sedeId = this.store.sedeId() ?? undefined;

		this.api
			.listarDelDia(fecha, sedeId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setItems(items ?? []);
				},
			});
	}

	loadEstudiantes(search?: string): void {
		const sedeId = this.store.sedeId() ?? undefined;

		this.api
			.listarEstudiantes(sedeId, search)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (estudiantes) => {
					this.store.setEstudiantes(estudiantes ?? []);
				},
			});
	}

	loadCierres(): void {
		const sedeId = this.store.sedeId() ?? undefined;
		const anio = new Date().getFullYear();

		this.api
			.listarCierres(sedeId, anio)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (cierres) => {
					this.store.setCierres(cierres ?? []);
				},
			});
	}

	// #endregion

	// #region Sincronización CrossChex

	sincronizarDesdeCrossChex(): void {
		if (this.store.syncing()) return;
		this.store.setSyncing(true);

		const fecha = this.store.fecha();

		this.api
			.sincronizarDesdeCrossChex(fecha)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (resultado) => {
					logger.log('Sincronización completada:', resultado);
					this.store.setSyncing(false);
					// Recargar datos después de la sincronización
					this.loadData();
				},
				error: (err) => {
					logger.error('Error al sincronizar:', err);
					this.store.setSyncing(false);
				},
			});
	}

	// #endregion

	// #region Filtros

	onFechaChange(fecha: string): void {
		this.store.setFecha(fecha);
		this.store.setStatsReady(false);
		this.store.setTableReady(false);
		this.loadData();
	}

	onSedeChange(sedeId: number | null): void {
		this.store.setSedeId(sedeId);
		this.store.setStatsReady(false);
		this.store.setTableReady(false);
		this.loadData();
	}

	onSearch(term: string): void {
		this.store.setSearchTerm(term);
	}

	// #endregion
}
