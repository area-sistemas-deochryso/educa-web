import { Component, inject, effect } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ToastModule } from 'primeng/toast'
import { MessageService } from 'primeng/api'
import { ErrorHandlerService } from '@core/services/error'

@Component({
	selector: 'app-toast-container',
	standalone: true,
	imports: [CommonModule, ToastModule],
	providers: [MessageService],
	template: `<p-toast position="top-right" [life]="5000"></p-toast>`,
})
export class ToastContainerComponent {
	private messageService = inject(MessageService)
	private errorHandler = inject(ErrorHandlerService)

	constructor() {
		effect(() => {
			const notification = this.errorHandler.currentNotification()
			if (notification) {
				this.messageService.add({
					severity: notification.severity,
					summary: notification.summary,
					detail: notification.detail,
					life: notification.life ?? 5000,
					sticky: notification.sticky ?? false,
				})
				this.errorHandler.clearNotification()
			}
		})
	}
}
