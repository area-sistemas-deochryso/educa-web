import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { logger } from '@core/helpers';
import { EmailQuarantineListaDto } from '@data/models/email-quarantine.models';

import { EmailQuarantineService } from './email-quarantine.service';
import { EmailQuarantineStore } from './email-quarantine.store';

@Injectable({ providedIn: 'root' })
export class EmailQuarantineUiFacade {
	private readonly store = inject(EmailQuarantineStore);
	private readonly service = inject(EmailQuarantineService);

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
		firstValueFrom(this.service.getDetalle(item.id))
			.then((detalle) => {
				if (this.store.drawerItem()?.id === item.id) {
					this.store.setDrawerDetalle(detalle);
				}
			})
			.catch((err) => {
				logger.warn('[EmailQuarantineUiFacade] getDetalle falló', err);
			});
	}

	closeDetailDrawer(): void {
		this.store.closeDrawer();
	}
}
