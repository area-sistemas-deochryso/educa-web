import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { logger } from '@core/helpers';
import {
	ErrorHandlerService,
	PermisosService,
	PermisoRol,
	RolTipoAdmin,
	ROLES_DISPONIBLES_ADMIN,
} from '@core/services';
import { AdminUtilsService } from '@shared/services';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';

import { PermisosRolesStore } from './permisos-roles.store';

@Injectable({ providedIn: 'root' })
export class PermisosRolesFacade {
	// #region Dependencias
	private api = inject(PermisosService);
	private store = inject(PermisosRolesStore);
	private errorHandler = inject(ErrorHandlerService);
	private destroyRef = inject(DestroyRef);
	readonly adminUtils = inject(AdminUtilsService);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	readonly rolesDisponibles = ROLES_DISPONIBLES_ADMIN;
	// #endregion

	// #region Comandos CRUD

	/** Carga inicial: vistas + permisos por rol (paginado) en paralelo */
	loadAll(): void {
		this.store.setLoading(true);

		forkJoin({
			vistas: this.api.getVistas(),
			permisosRol: this.api.getPermisosRolPaginated(1, this.store.pageSize(), 'Apoderado'),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ vistas, permisosRol }) => {
					this.store.setVistas(vistas.filter((v) => v.estado === 1));
					this.store.setPermisosRol(permisosRol.data);
					this.store.setPaginationData(
						permisosRol.page,
						permisosRol.pageSize,
						permisosRol.total,
					);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al cargar datos:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadPermisos,
					);
					this.store.setLoading(false);
				},
			});
	}

	/** Cambiar de página (lazy loading) */
	loadPage(page: number, pageSize: number): void {
		this.store.setPage(page);
		this.store.setPageSize(pageSize);
		this.refreshPermisosRolOnly();
	}

	/** CREAR/EDITAR: Refetch (estructura de vistas compleja) */
	savePermiso(): void {
		const vistas = this.store.selectedVistas();
		this.store.setLoading(true);

		const operation$ = this.store.isEditing()
			? (() => {
					const permiso = this.store.selectedPermiso();
					if (!permiso) return null;
					return this.api.actualizarPermisoRol(permiso.id, { vistas });
				})()
			: (() => {
					const rol = this.store.selectedRol();
					if (!rol) return null;
					return this.api.crearPermisoRol({ rol, vistas });
				})();

		if (!operation$) {
			this.store.setLoading(false);
			return;
		}

		operation$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => {
				this.store.closeDialog();
				this.refreshPermisosRolOnly();
			},
			error: (err) => {
				logger.error('Error:', err);
				this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.savePermiso);
				this.store.setLoading(false);
			},
		});
	}

	/**
	 * ELIMINAR: Mutación quirúrgica
	 */
	delete(permiso: PermisoRol): void {
		this.store.setLoading(true);

		this.api
			.eliminarPermisoRol(permiso.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.removePermiso(permiso.id);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al eliminar:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.deletePermiso,
					);
					this.store.setLoading(false);
				},
			});
	}

	/** Refetch solo permisos por rol (sin recargar vistas) */
	private refreshPermisosRolOnly(): void {
		this.store.setLoading(true);
		const page = this.store.page();
		const pageSize = this.store.pageSize();

		this.api
			.getPermisosRolPaginated(page, pageSize, 'Apoderado')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.store.setPermisosRol(result.data);
					this.store.setPaginationData(result.page, result.pageSize, result.total);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('Error al refrescar permisos:', err);
					this.store.setLoading(false);
				},
			});
	}

	// #endregion

	// #region Comandos de UI

	openNewDialog(): void {
		this.store.setSelectedPermiso(null);
		this.store.setSelectedRol(null);
		this.store.setSelectedVistas([]);
		this.store.setIsEditing(false);
		this.store.buildModulosVistas([]);
		this.store.openDialog();
	}

	openEditDialog(permiso: PermisoRol): void {
		this.store.setSelectedPermiso(permiso);
		this.store.setSelectedRol(permiso.rol as RolTipoAdmin);
		this.store.setSelectedVistas([...permiso.vistas]);
		this.store.setIsEditing(true);
		this.store.buildModulosVistas(permiso.vistas);
		this.store.openDialog();
	}

	openDetail(permiso: PermisoRol): void {
		this.store.openDetailDrawer(permiso);
	}

	closeDetail(): void {
		this.store.closeDetailDrawer();
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

	editFromDetail(): void {
		const permiso = this.store.selectedPermiso();
		if (permiso) {
			this.closeDetail();
			this.openEditDialog(permiso);
		}
	}

	// #endregion

	// #region Comandos de formulario
	setSelectedRol(rol: RolTipoAdmin | null): void {
		this.store.setSelectedRol(rol);
	}

	setActiveModuloIndex(index: number): void {
		this.store.setActiveModuloIndex(index);
	}

	setVistasBusqueda(term: string): void {
		this.store.setVistasBusqueda(term);
	}

	toggleVista(ruta: string): void {
		this.store.toggleVista(ruta);
	}

	toggleAllVistasModulo(): void {
		this.store.toggleAllVistasModulo();
	}
	// #endregion
}
