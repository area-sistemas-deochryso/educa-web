import { Injectable, inject } from '@angular/core';

import { facadeErrorHandler } from '@core/helpers';
import {
	PermissionsService,
	ErrorHandlerService,
	WalFacadeHelper,
} from '@core/services';
import { environment } from '@config';
import { PermissionsUsersStore } from './permisos-usuarios.store';
import { PermissionsUsersDataFacade } from './permisos-usuarios-data.facade';

@Injectable({ providedIn: 'root' })
export class PermissionsUsersCrudFacade {
	private store = inject(PermissionsUsersStore);
	private permisosService = inject(PermissionsService);
	private dataFacade = inject(PermissionsUsersDataFacade);
	private wal = inject(WalFacadeHelper);
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/permisos`;
	private readonly errHandler = facadeErrorHandler({
		tag: 'PermisosUsuariosCrudFacade',
		errorHandler: inject(ErrorHandlerService),
	});

	// #region Save (Create + Update)
	savePermiso(hideDialog: () => void): void {
		const vistas = this.store.selectedVistas();

		if (this.store.isEditing()) {
			const permiso = this.store.selectedPermiso();
			if (!permiso) return;

			const payload = { vistas, rowVersion: permiso.rowVersion };

			this.wal.execute({
				operation: 'UPDATE',
				resourceType: 'PermisoUsuario',
				resourceId: permiso.id,
				endpoint: `${this.apiUrl}/usuario/${permiso.id}/actualizar`,
				method: 'PUT',
				payload,
				http$: () => this.permisosService.actualizarPermisoUsuario(permiso.id, payload),
				optimistic: {
					apply: () => hideDialog(),
					rollback: () => {},
				},
				onCommit: () => this.dataFacade.loadData(),
				onError: (err) => this.errHandler.handle(err, 'guardar el permiso'),
			});
		} else {
			const usuarioId = this.store.selectedUsuarioId();
			const rol = this.store.selectedRol();
			if (!usuarioId || !rol) return;

			const payload = { usuarioId, rol, vistas };

			this.wal.execute({
				operation: 'CREATE',
				resourceType: 'PermisoUsuario',
				endpoint: `${this.apiUrl}/usuario/crear`,
				method: 'POST',
				payload,
				http$: () => this.permisosService.crearPermisoUsuario(payload),
				optimistic: {
					apply: () => hideDialog(),
					rollback: () => {},
				},
				onCommit: () => this.dataFacade.loadData(),
				onError: (err) => this.errHandler.handle(err, 'guardar el permiso'),
			});
		}
	}
	// #endregion

	// #region Delete
	deletePermiso(id: number): void {
		const snapshot = this.store.permisosUsuario().find((p) => p.id === id);

		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'PermisoUsuario',
			resourceId: id,
			endpoint: `${this.apiUrl}/usuario/${id}/eliminar`,
			method: 'DELETE',
			payload: null,
			http$: () => this.permisosService.eliminarPermisoUsuario(id),
			optimistic: {
				apply: () => this.store.removePermisoUsuario(id),
				rollback: () => {
					if (snapshot) this.store.addPermisoUsuario(snapshot);
				},
			},
			onCommit: () => {},
			onError: (err) => this.errHandler.handle(err, 'eliminar el permiso'),
		});
	}
	// #endregion

	// #region Vista Selection
	isVistaSelected(ruta: string): boolean {
		return this.store.selectedVistas().includes(ruta);
	}

	toggleVista(ruta: string): void {
		this.store.toggleVista(ruta);
		this.store.updateModuloCount();
	}

	toggleAllVistasModulo(): void {
		this.store.toggleAllVistasModulo();
		this.store.updateModuloCount();
	}
	// #endregion
}
