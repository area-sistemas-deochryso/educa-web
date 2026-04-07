import { Injectable, inject } from '@angular/core';

import { TipoOperacionAsistencia, AsistenciaAdminLista } from '../models';
import { AsistenciasAdminStore } from './asistencias-admin.store';

@Injectable({ providedIn: 'root' })
export class AsistenciasUiFacade {
	// #region Dependencias
	private store = inject(AsistenciasAdminStore);
	// #endregion

	// #region Dialog de asistencia

	openNewDialog(tipo: TipoOperacionAsistencia = 'entrada'): void {
		this.store.openNewDialog(tipo);
	}

	openSalidaDialog(item: AsistenciaAdminLista): void {
		this.store.openSalidaDialog(item);
	}

	openEditDialog(item: AsistenciaAdminLista): void {
		this.store.openEditDialog(item);
	}

	closeDialog(): void {
		this.store.closeDialog();
	}

	// #endregion

	// #region Dialog de cierre mensual

	openCierreDialog(): void {
		this.store.openCierreDialog();
	}

	closeCierreDialog(): void {
		this.store.closeCierreDialog();
	}

	// #endregion

	// #region Confirm dialog

	openConfirmDialog(): void {
		this.store.openConfirmDialog();
	}

	closeConfirmDialog(): void {
		this.store.closeConfirmDialog();
	}

	// #endregion
}
