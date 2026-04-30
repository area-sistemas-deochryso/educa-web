import { Injectable, inject } from '@angular/core';

import { EmailBlacklistEntry } from '@data/models/email-blacklist.models';

import { BlacklistStore } from './blacklist.store';

/**
 * Plan 38 Chat 5 — orquestación pura de visibilidad de dialog/drawer.
 * Sin IO, sin lógica de negocio.
 */
@Injectable({ providedIn: 'root' })
export class BlacklistUiFacade {
	private readonly store = inject(BlacklistStore);

	// #region Dialog "Agregar"
	openAddDialog(prefilledCorreo: string | null = null): void {
		this.store.setFormData({
			correo: prefilledCorreo ?? '',
			motivo: 'MANUAL',
			observacion: '',
		});
		this.store.openDialog();
	}

	closeDialog(): void {
		this.store.closeDialog();
	}
	// #endregion

	// #region Drawer detalle
	openDetailDrawer(item: EmailBlacklistEntry): void {
		this.store.openDrawer(item);
	}

	closeDetailDrawer(): void {
		this.store.closeDrawer();
	}
	// #endregion
}
