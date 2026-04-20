import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { logger } from '@core/helpers';
import { SincronizarResultado, TipoPersonaAsistencia, TipoPersonaFilter } from '../models';
import { AttendancesAdminService } from './attendances-admin.service';
import { AttendancesAdminStore } from './attendances-admin.store';

/** Convierte el filtro UI (`'todos'`) al param que el backend espera (`null`). */
function toApiTipoPersona(filter: TipoPersonaFilter): TipoPersonaAsistencia | null {
	return filter === 'todos' ? null : filter;
}

@Injectable({ providedIn: 'root' })
export class AttendancesDataFacade {
	// #region Dependencias
	private api = inject(AttendancesAdminService);
	private store = inject(AttendancesAdminStore);
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
		// Stats siempre globales (E+P desglosado) — no dependen del filtro UI.
		this.api
			.obtenerEstadisticas(fecha, sedeId, null)
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
		const tipoPersona = toApiTipoPersona(this.store.tipoPersonaFilter());

		this.api
			.listarDelDia(fecha, sedeId, undefined, tipoPersona)
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
		const tipoPersona = toApiTipoPersona(this.store.tipoPersonaFilter());

		this.api
			.listarDelDia(fecha, sedeId, undefined, tipoPersona)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setItems(items ?? []);
				},
			});
	}

	loadPersonas(tipoPersona: TipoPersonaAsistencia, search?: string): void {
		const sedeId = this.store.sedeId() ?? undefined;

		this.api
			.listarPersonas(sedeId, search, tipoPersona)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (personas) => {
					this.store.setPersonas(personas ?? []);
				},
			});
	}

	/** Alias retrocompat — carga personas del tipo configurado (default `E`). */
	loadEstudiantes(search?: string): void {
		const filter = this.store.tipoPersonaFilter();
		const tipo: TipoPersonaAsistencia = filter === 'P' ? 'P' : 'E';
		this.loadPersonas(tipo, search);
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

	sincronizarDesdeCrossChex(
		onSuccess?: (resultado: SincronizarResultado) => void,
		onError?: (err: unknown) => void,
	): void {
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
					this.loadData();
					onSuccess?.(resultado);
				},
				error: (err) => {
					logger.error('Error al sincronizar:', err);
					this.store.setSyncing(false);
					onError?.(err);
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

	onTipoPersonaChange(tipo: TipoPersonaFilter): void {
		if (this.store.tipoPersonaFilter() === tipo) return;
		this.store.setTipoPersonaFilter(tipo);
		this.store.setTableReady(false);
		this.loadItems();
	}

	// #endregion
}
