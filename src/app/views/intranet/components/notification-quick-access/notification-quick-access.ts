import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '@app/services';

@Component({
	selector: 'app-notification-quick-access',
	imports: [CommonModule],
	templateUrl: './notification-quick-access.html',
	styleUrl: './notification-quick-access.scss',
})
export class NotificationQuickAccess {
	private notificationsService = inject(NotificationsService);

	unreadCount = this.notificationsService.unreadCount;
	highestPriority = this.notificationsService.highestPriority;

	togglePanel(): void {
		this.notificationsService.togglePanel();
	}

	getBadgePriorityClass(): string {
		const priority = this.highestPriority();
		if (!priority) return '';
		return `badge-${priority}`;
	}
}
