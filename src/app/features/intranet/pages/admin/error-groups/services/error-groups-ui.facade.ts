import { Injectable, inject } from '@angular/core';

import { ErrorGroupLista } from '../models';
import { ErrorGroupsDataFacade } from './error-groups-data.facade';
import { ErrorGroupsStore } from './error-groups.store';

@Injectable({ providedIn: 'root' })
export class ErrorGroupsUiFacade {
	// #region Dependencias
	private readonly store = inject(ErrorGroupsStore);
	private readonly dataFacade = inject(ErrorGroupsDataFacade);
	// #endregion

	// #region Drawer del grupo
	openDrawer(group: ErrorGroupLista): void {
		this.store.openDrawer(group);
		this.dataFacade.loadGroupDetalle(group.id);
		this.store.setOcurrenciasPage(1);
		this.dataFacade.loadOcurrencias(group.id);
	}

	closeDrawer(): void {
		this.store.closeDrawer();
	}
	// #endregion

	// #region Sub-drawer de ocurrencia
	openOccurrenceDrawer(ocurrenciaId: number): void {
		this.store.openOccurrenceDrawer(ocurrenciaId);
	}

	closeOccurrenceDrawer(): void {
		this.store.closeOccurrenceDrawer();
	}
	// #endregion

	// #region Dialog cambio estado
	openDialog(group: ErrorGroupLista): void {
		this.store.openDialog(group);
	}

	closeDialog(): void {
		this.store.closeDialog();
	}
	// #endregion
}
