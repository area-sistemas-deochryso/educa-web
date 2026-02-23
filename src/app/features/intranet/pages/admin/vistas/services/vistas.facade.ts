import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger } from '@core/helpers';
import { ErrorHandlerService, PermisosService, Vista } from '@core/services';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';

import { VistasStore } from './vistas.store';

@Injectable({ providedIn: 'root' })
export class VistasFacade {
	// #region Dependencias
	private api = inject(PermisosService);
	private store = inject(VistasStore);
	private errorHandler = inject(ErrorHandlerService);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos CRUD

	/** Carga inicial: estadísticas + primera página en paralelo */
	loadAll(): void {
		this.store.setLoading(true);

		forkJoin({
			vistas: this.api.getVistasPaginated(1, this.store.pageSize()),
			stats: this.api.getVistasEstadisticas(),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ vistas, stats }) => {
					this.store.setVistas(vistas.data);
					this.store.setPaginationData(vistas.page, vistas.pageSize, vistas.total);
					this.store.setEstadisticas(stats);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar vistas:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.loadVistas);
					this.store.setLoading(false);
				},
			});
	}

	/** Cambio de página desde p-table lazy load */
	loadPage(page: number, pageSize: number): void {
		this.store.setPage(page);
		this.store.setPageSize(pageSize);
		this.refreshVistasOnly();
	}

	/**
	 * CREAR: Refetch items only (necesita ID del servidor) + refetch stats
	 */
	create(ruta: string, nombre: string): void {
		this.store.setLoading(true);

		this.api
			.crearVista({ ruta, nombre })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.closeDialog();
					this.refreshVistasOnly();
					this.refreshEstadisticas();
				},
				error: (err) => {
					logger.error('Error al crear vista:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.saveVista);
					this.store.setLoading(false);
				},
			});
	}

	/**
	 * EDITAR: Mutación quirúrgica (no refetch)
	 */
	update(id: number, ruta: string, nombre: string, estado: number): void {
		this.store.setLoading(true);

		this.api
			.actualizarVista(id, { ruta, nombre, estado })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.updateVista(id, { ruta, nombre, estado });
					this.store.closeDialog();
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al actualizar vista:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.saveVista);
					this.store.setLoading(false);
				},
			});
	}

	/**
	 * TOGGLE: Mutación quirúrgica + stats incrementales
	 */
	toggleEstado(vista: Vista): void {
		this.store.setLoading(true);
		const nuevoEstado = vista.estado === 1 ? 0 : 1;

		this.api
			.actualizarVista(vista.id, {
				ruta: vista.ruta,
				nombre: vista.nombre,
				estado: nuevoEstado,
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.toggleVistaEstado(vista.id);

					if (vista.estado === 1) {
						this.store.incrementarEstadistica('vistasActivas', -1);
						this.store.incrementarEstadistica('vistasInactivas', 1);
					} else {
						this.store.incrementarEstadistica('vistasActivas', 1);
						this.store.incrementarEstadistica('vistasInactivas', -1);
					}

					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al cambiar estado:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.changeEstado);
					this.store.setLoading(false);
				},
			});
	}

	/**
	 * ELIMINAR: Mutación quirúrgica + stats incrementales
	 */
	delete(vista: Vista): void {
		this.store.setLoading(true);

		this.api
			.eliminarVista(vista.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.removeVista(vista.id);
					this.store.incrementarEstadistica('totalVistas', -1);

					if (vista.estado === 1) {
						this.store.incrementarEstadistica('vistasActivas', -1);
					} else {
						this.store.incrementarEstadistica('vistasInactivas', -1);
					}

					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al eliminar vista:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.deleteVista);
					this.store.setLoading(false);
				},
			});
	}

	// #endregion

	// #region Comandos de UI

	/** Orquesta CREAR o EDITAR según isEditing */
	saveVista(): void {
		const formData = this.store.formData();

		if (this.store.isEditing()) {
			const vista = this.store.selectedVista();
			if (!vista) return;
			this.update(vista.id, formData.ruta, formData.nombre, formData.estado);
		} else {
			this.create(formData.ruta, formData.nombre);
		}
	}

	openNewDialog(): void {
		this.store.closeDialog();
		this.store.openDialog();
	}

	openEditDialog(vista: Vista): void {
		this.store.setSelectedVista(vista);
		this.store.setFormData({
			ruta: vista.ruta,
			nombre: vista.nombre,
			estado: vista.estado ?? 1,
		});
		this.store.setIsEditing(true);
		this.store.openDialog();
	}

	closeDialog(): void {
		this.store.closeDialog();
	}

	openConfirmDialog(): void {
		this.store.openConfirmDialog();
	}

	closeConfirmDialog(): void {
		this.store.closeConfirmDialog();
	}

	// #endregion

	// #region Comandos de formulario
	updateFormField(field: 'ruta' | 'nombre' | 'estado', value: unknown): void {
		this.store.updateFormField(field, value);
	}
	// #endregion

	// #region Comandos de filtros — resetean page y refetch server-side
	setSearchTerm(term: string): void {
		this.store.setSearchTerm(term);
		this.store.setPage(1);
		this.refreshVistasOnly();
	}

	setFilterModulo(modulo: string | null): void {
		this.store.setFilterModulo(modulo);
		this.store.setPage(1);
		this.refreshVistasOnly();
	}

	setFilterEstado(estado: number | null): void {
		this.store.setFilterEstado(estado);
		this.store.setPage(1);
		this.refreshVistasOnly();
	}

	clearFilters(): void {
		this.store.clearFiltros();
		this.refreshVistasOnly();
	}
	// #endregion

	// #region Helpers privados

	/** Refetch solo la lista paginada con filtros actuales del store */
	private refreshVistasOnly(): void {
		this.store.setLoading(true);

		const page = this.store.page();
		const pageSize = this.store.pageSize();
		const search = this.store.searchTerm() || undefined;
		const modulo = this.store.filterModulo() || undefined;
		const estado = this.store.filterEstado();

		this.api
			.getVistasPaginated(page, pageSize, search, modulo, estado)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.store.setVistas(result.data);
					this.store.setPaginationData(result.page, result.pageSize, result.total);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al refrescar vistas:', err);
					this.store.setLoading(false);
				},
			});
	}

	/** Refetch estadísticas desde el servidor */
	private refreshEstadisticas(): void {
		this.api
			.getVistasEstadisticas()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (stats) => this.store.setEstadisticas(stats),
				error: (err) => logger.error('Error al refrescar estadísticas:', err),
			});
	}
	// #endregion
}
