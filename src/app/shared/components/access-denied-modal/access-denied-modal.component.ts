import { Component, inject, computed } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

import { ModalManagerService } from '@core/services';

export const ACCESS_DENIED_MODAL_ID = 'access-denied-modal';

@Component({
	selector: 'app-access-denied-modal',
	imports: [DialogModule, ButtonModule],
	templateUrl: './access-denied-modal.component.html',
	styleUrl: './access-denied-modal.component.scss',
})
export class AccessDeniedModalComponent {
	// * Centralized modal manager drives open/close and data lookup.
	private readonly modalManager = inject(ModalManagerService);

	// * Visibility + snapshot state from the modal registry.
	readonly visible = this.modalManager.isOpen(ACCESS_DENIED_MODAL_ID);
	readonly state = this.modalManager.getState(ACCESS_DENIED_MODAL_ID);

	// * Pull the denied route when the guard supplies it.
	readonly rutaDenegada = computed(() => {
		const data = this.modalManager.getData<{ ruta: string }>(ACCESS_DENIED_MODAL_ID);
		return data?.ruta ?? '';
	});

	// * Close action from the footer CTA.
	close(): void {
		this.modalManager.close(ACCESS_DENIED_MODAL_ID);
	}
}
