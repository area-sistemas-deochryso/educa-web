import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService, PermisosService, Vista, WalFacadeHelper } from '@core/services';
import { environment } from '@config';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';

import { VistasStore } from './vistas.store';

@Injectable({ providedIn: 'root' })
export class VistasFacade {
	// #region Dependencias
	private api = inject(PermisosService);
	private store = inject(VistasStore);
	private errorHandler = inject(ErrorHandlerService);
	private wal = inject(WalFacadeHelper);
	private destroyRef = inject(DestroyRef);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/permisos`;
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos CRUD

	/** Carga inicial: estadísticas + primera página en paralelo */
	loadAll(): void {
		this.store.setLoading(true);
		this.store.clearError();

		forkJoin({
			vistas: this.api.getVistasPaginated(1, this.store.pageSize()),
			stats: this.api.getVistasEstadisticas(),
		})
			.pipe(
				withRetry({ tag: 'VistasFacade:loadAll' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: ({ vistas, stats }) => {
					this.store.setItems(vistas.data);
					this.store.setPaginationData(vistas.page, vistas.pageSize, vistas.total);
					this.store.setEstadisticas(stats);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar vistas:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.loadVistas);
					this.store.setError(UI_ADMIN_ERROR_DETAILS.loadVistas);
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
	 * CREAR: WAL → optimistic close dialog → refetch on commit
	 */
	create(ruta: string, nombre: string): void {
		const payload = { ruta, nombre };

		this.wal.execute({
			operation: 'CREATE',
			resourceType: 'Vista',
			endpoint: `${this.apiUrl}/vistas/crear`,
			method: 'POST',
			payload,
			http$: () => this.api.crearVista(payload),
			optimistic: {
				apply: () => this.store.closeDialog(),
				rollback: () => {},
			},
			onCommit: () => {
				this.refreshVistasOnly();
				this.refreshEstadisticas();
			},
			onError: () => this.handleApiError(UI_ADMIN_ERROR_DETAILS.saveVista),
		});
	}

	/**
	 * EDITAR: WAL → optimistic update → rollback to snapshot
	 */
	update(id: number, ruta: string, nombre: string, estado: number): void {
		const snapshot = this.store.items().find((v) => v.id === id);
		const payload = { ruta, nombre, estado, rowVersion: snapshot?.rowVersion };

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'Vista',
			resourceId: id,
			endpoint: `${this.apiUrl}/vistas/${id}/actualizar`,
			method: 'PUT',
			payload,
			http$: () => this.api.actualizarVista(id, payload),
			optimistic: {
				apply: () => {
					this.store.updateItem(id, { ruta, nombre, estado });
					this.store.closeDialog();
				},
				rollback: () => {
					if (snapshot) this.store.updateItem(id, snapshot);
				},
			},
			onCommit: () => this.store.setLoading(false),
			onError: () => this.handleApiError(UI_ADMIN_ERROR_DETAILS.saveVista),
		});
	}

	/**
	 * TOGGLE: WAL → optimistic toggle + stats → rollback reverses
	 */
	toggleEstado(vista: Vista): void {
		const nuevoEstado = vista.estado === 1 ? 0 : 1;
		const payload = { ruta: vista.ruta, nombre: vista.nombre, estado: nuevoEstado, rowVersion: vista.rowVersion };

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'Vista',
			resourceId: vista.id,
			endpoint: `${this.apiUrl}/vistas/${vista.id}/actualizar`,
			method: 'PUT',
			payload,
			http$: () => this.api.actualizarVista(vista.id, payload),
			optimistic: {
				apply: () => {
					this.store.toggleVistaEstado(vista.id);
					if (vista.estado === 1) {
						this.store.incrementarEstadistica('vistasActivas', -1);
						this.store.incrementarEstadistica('vistasInactivas', 1);
					} else {
						this.store.incrementarEstadistica('vistasActivas', 1);
						this.store.incrementarEstadistica('vistasInactivas', -1);
					}
				},
				rollback: () => {
					this.store.toggleVistaEstado(vista.id);
					if (vista.estado === 1) {
						this.store.incrementarEstadistica('vistasActivas', 1);
						this.store.incrementarEstadistica('vistasInactivas', -1);
					} else {
						this.store.incrementarEstadistica('vistasActivas', -1);
						this.store.incrementarEstadistica('vistasInactivas', 1);
					}
				},
			},
			onCommit: () => this.store.setLoading(false),
			onError: () => this.handleApiError(UI_ADMIN_ERROR_DETAILS.changeEstado),
		});
	}

	/**
	 * ELIMINAR: WAL → optimistic remove + stats → rollback re-adds
	 */
	delete(vista: Vista): void {
		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'Vista',
			resourceId: vista.id,
			endpoint: `${this.apiUrl}/vistas/${vista.id}/eliminar`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminarVista(vista.id),
			optimistic: {
				apply: () => {
					this.store.removeItem(vista.id);
					this.store.incrementarEstadistica('totalVistas', -1);
					if (vista.estado === 1) {
						this.store.incrementarEstadistica('vistasActivas', -1);
					} else {
						this.store.incrementarEstadistica('vistasInactivas', -1);
					}
				},
				rollback: () => {
					this.store.addItem(vista);
					this.store.incrementarEstadistica('totalVistas', 1);
					if (vista.estado === 1) {
						this.store.incrementarEstadistica('vistasActivas', 1);
					} else {
						this.store.incrementarEstadistica('vistasInactivas', 1);
					}
				},
			},
			onCommit: () => this.store.setLoading(false),
			onError: () => this.handleApiError(UI_ADMIN_ERROR_DETAILS.deleteVista),
		});
	}

	// #endregion

	// #region Comandos de UI

	/** Orquesta CREAR o EDITAR según isEditing */
	saveVista(): void {
		const formData = this.store.formData();

		if (this.store.isEditing()) {
			const vista = this.store.selectedItem();
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
		this.store.setSelectedItem(vista);
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
	updateFormField(field: 'ruta' | 'nombre' | 'estado', value: string | number): void {
		this.store.updateFormField(field, value as never);
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

	private handleApiError(detail: string): void {
		this.errorHandler.showError(UI_SUMMARIES.error, detail);
		this.store.setLoading(false);
	}

	/** Refetch solo la lista paginada con filtros actuales del store */
	private refreshVistasOnly(): void {
		this.store.setLoading(true);

		const page = this.store.page();
		const pageSize = this.store.pageSize();
		const search = this.store.searchTerm() || undefined;
		const modulo = this.store.filterModulo() || undefined;
		const estado = this.store.filterEstado() as number | null;

		this.api
			.getVistasPaginated(page, pageSize, search, modulo, estado)
			.pipe(
				withRetry({ tag: 'VistasFacade:refreshVistasOnly' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (result) => {
					this.store.setItems(result.data);
					this.store.setPaginationData(result.page, result.pageSize, result.total);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al refrescar vistas:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.refreshData);
					this.store.setLoading(false);
				},
			});
	}

	/** Refetch estadísticas desde el servidor */
	private refreshEstadisticas(): void {
		this.api
			.getVistasEstadisticas()
			.pipe(
				withRetry({ tag: 'VistasFacade:refreshEstadisticas' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (stats) => this.store.setEstadisticas(stats),
				error: (err) => {
					logger.error('Error al refrescar estadísticas:', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.refreshData);
				},
			});
	}
	// #endregion
}
