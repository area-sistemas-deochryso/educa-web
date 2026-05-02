import { Injectable, inject } from '@angular/core';

import { EmailQuarantineListaDto } from '@data/models/email-quarantine.models';

import { EmailQuarantineStore } from './email-quarantine.store';

@Injectable({ providedIn: 'root' })
export class EmailQuarantineUiFacade {
	private readonly store = inject(EmailQuarantineStore);

	openAddDialog(prefilledDestinatario: string | null = null): void {
		this.store.setFormData({
			destinatario: prefilledDestinatario ?? '',
			motivo: 'MANUAL',
			durationHours: 24,
			observacion: '',
		});
		this.store.openDialog();
	}

	closeDialog(): void {
		this.store.closeDialog();
	}

	openDetailDrawer(item: EmailQuarantineListaDto): void {
		this.store.openDrawer(item);
	}

	closeDetailDrawer(): void {
		this.store.closeDrawer();
	}
}
