import { Injectable, inject } from '@angular/core';

import { PermisoUsuario, RolTipoAdmin } from '@core/services';
import { PermissionsUsersStore } from './permisos-usuarios.store';
import { PermissionsUsersHelperService } from './permisos-usuarios-helper.service';

@Injectable({ providedIn: 'root' })
export class PermissionsUsersUiFacade {
	private store = inject(PermissionsUsersStore);
	private helperService = inject(PermissionsUsersHelperService);

	// #region Estado expuesto (UI-specific)
	readonly dialogVisible = this.store.dialogVisible;
	readonly detailDrawerVisible = this.store.detailDrawerVisible;
	readonly isEditing = this.store.isEditing;
	readonly selectedUsuarioId = this.store.selectedUsuarioId;
	readonly modulosVistas = this.store.modulosVistas;
	readonly activeModuloIndex = this.store.activeModuloIndex;
	readonly vistasBusqueda = this.store.vistasBusqueda;
	readonly vistasFiltradas = this.store.vistasFiltradas;
	readonly isAllModuloSelected = this.store.isAllModuloSelected;
	// #endregion

	// #region Detail Drawer
	openDetail(permiso: PermisoUsuario): void {
		this.store.setSelectedPermiso(permiso);
		this.store.setDetailDrawerVisible(true);
	}

	closeDetail(): void {
		this.store.setDetailDrawerVisible(false);
	}
	// #endregion

	// #region Edit Dialog
	openNew(): void {
		this.store.resetDialogState();
		const modulos = this.helperService.buildModulosVistas(this.store.vistas(), []);
		this.store.setModulosVistas(modulos);
		this.store.setDialogVisible(true);
	}

	editPermiso(permiso: PermisoUsuario): void {
		this.store.setSelectedPermiso(permiso);
		this.store.setSelectedUsuarioId(permiso.usuarioId);
		this.store.setSelectedRol(permiso.rol as RolTipoAdmin);
		this.store.setSelectedVistas([...permiso.vistas]);
		this.store.setIsEditing(true);

		const modulos = this.helperService.buildModulosVistas(this.store.vistas(), permiso.vistas);
		this.store.setModulosVistas(modulos);
		this.store.setDialogVisible(true);
	}

	editFromDetail(): void {
		const permiso = this.store.selectedPermiso();
		if (permiso) {
			this.closeDetail();
			this.editPermiso(permiso);
		}
	}

	hideDialog(): void {
		this.store.setDialogVisible(false);
		this.store.setVistasBusqueda('');
		this.store.setActiveModuloIndex(0);
	}
	// #endregion

	// #region Form Setters
	setSelectedRol(rol: RolTipoAdmin | null): void {
		this.store.setSelectedRol(rol);
	}

	setSelectedUsuarioId(id: number | null): void {
		this.store.setSelectedUsuarioId(id);
	}

	setActiveModuloIndex(index: number): void {
		this.store.setActiveModuloIndex(index);
	}

	setVistasBusqueda(term: string): void {
		this.store.setVistasBusqueda(term);
	}
	// #endregion
}
