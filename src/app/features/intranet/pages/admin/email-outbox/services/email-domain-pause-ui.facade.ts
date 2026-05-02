import { Injectable, inject } from '@angular/core';

import { EmailDomainPauseStore } from './email-domain-pause.store';

@Injectable({ providedIn: 'root' })
export class EmailDomainPauseUiFacade {
	private readonly store = inject(EmailDomainPauseStore);

	openAddDialog(prefilledDominio: string | null = null): void {
		this.store.setFormData({
			dominio: prefilledDominio ?? '',
			motivo: 'MANUAL',
			durationHours: 6,
			observacion: '',
		});
		this.store.openDialog();
	}

	closeDialog(): void {
		this.store.closeDialog();
	}
}
