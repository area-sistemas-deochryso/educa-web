import { Component, effect, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { ErrorHandlerService } from '@core/services/error';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
	selector: 'app-toast-container',
	standalone: true,
	imports: [CommonModule, ToastModule],
	providers: [MessageService],
	templateUrl: './toast-container.component.html',
})
export class ToastContainerComponent {
	private messageService = inject(MessageService);
	private errorHandler = inject(ErrorHandlerService);

	constructor() {
		effect(() => {
			const notification = this.errorHandler.currentNotification();
			if (notification) {
				this.messageService.add({
					severity: notification.severity,
					summary: notification.summary,
					detail: notification.detail,
					life: notification.life ?? 5000,
					sticky: notification.sticky ?? false,
				});
				this.errorHandler.clearNotification();
			}
		});
	}
}
