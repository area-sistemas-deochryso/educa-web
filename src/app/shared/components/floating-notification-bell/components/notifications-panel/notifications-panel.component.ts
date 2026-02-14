// #region Imports
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeasonalNotification } from '@core/services';
import { NotificationsPanelHeaderComponent } from '../notifications-panel-header/notifications-panel-header.component';
import { NotificationCardComponent } from '../notification-card/notification-card.component';
import { DismissedSectionComponent } from '../dismissed-section/dismissed-section.component';
import { NotificationsFooterComponent } from '../notifications-footer/notifications-footer.component';
import { NotificationsPanelContext } from '../../notifications-panel.context';

// #endregion
// #region Implementation
@Component({
	selector: 'app-notifications-panel',
	imports: [
		CommonModule,
		NotificationsPanelHeaderComponent,
		NotificationCardComponent,
		DismissedSectionComponent,
		NotificationsFooterComponent,
	],
	templateUrl: './notifications-panel.component.html',
	styleUrl: './notifications-panel.component.scss',
})
export class NotificationsPanelComponent {
	// * Shared context for notifications list and panel actions.
	private context = inject(NotificationsPanelContext);

	// * Expose context signals for template bindings.
	notifications = this.context.notifications;
	dismissedNotifications = this.context.dismissedNotifications;
	notificationCount = this.context.notificationCount;
	dismissedCount = this.context.dismissedCount;

	isRead(id: string): boolean {
		return this.context.isRead(id);
	}

	trackById(_index: number, notification: SeasonalNotification): string {
		return notification.id;
	}

	onOverlayClick(): void {
		// * Close panel when clicking the overlay.
		this.context.closePanel();
	}

	onFooterLinkClick(): void {
		// * Close panel after navigating away.
		this.context.closePanel();
	}
}
// #endregion
