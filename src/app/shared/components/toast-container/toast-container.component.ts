// #region Imports
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';

import { ErrorHandlerService } from '@core/services/error';
import type { ErrorNotificationAction, ErrorSeverity } from '@core/services/error';
import { EduButton, EduMessageService, EduTemplate, EduToast } from '@edu-ui';
import type { EduToastSeverity } from '@edu-ui';

// #endregion
// #region Implementation
const ERROR_SEVERITY_TO_TOAST_SEVERITY: Record<ErrorSeverity, EduToastSeverity> = {
	info: 'info',
	success: 'success',
	warn: 'warn',
	error: 'danger',
};

@Component({
	selector: 'app-toast-container',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [EduToast, EduButton, EduTemplate],
	providers: [EduMessageService],
	templateUrl: './toast-container.component.html',
})
export class ToastContainerComponent {
	// * PrimeNG message service + app error handler bridge.
	private messageService = inject(EduMessageService);
	private errorHandler = inject(ErrorHandlerService);

	constructor() {
		// * Listen for error notifications and render a toast.
		effect(() => {
			const notification = this.errorHandler.currentNotification();
			if (notification) {
				this.messageService.add({
					severity: ERROR_SEVERITY_TO_TOAST_SEVERITY[notification.severity],
					summary: notification.summary,
					detail: notification.detail,
					life: notification.life ?? 5000,
					sticky: notification.sticky ?? false,
					data: notification.action ? { action: notification.action } : undefined,
				});
				this.errorHandler.clearNotification();
			}
		});
	}

	onAction(message: { data?: { action?: ErrorNotificationAction } }): void {
		const action = message.data?.action;
		if (!action) return;
		action.callback();
		this.messageService.clear();
	}
}
// #endregion
