import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrioritySummaryComponent } from '../priority-summary/priority-summary.component';
import { NotificationsPanelContext } from '../../notifications-panel.context';

@Component({
	selector: 'app-notifications-panel-header',
	imports: [CommonModule, PrioritySummaryComponent],
	templateUrl: './notifications-panel-header.component.html',
	styleUrl: './notifications-panel-header.component.scss',
})
export class NotificationsPanelHeaderComponent {
	// * Context signals for summary counts.
	private context = inject(NotificationsPanelContext);

	notificationCount = this.context.notificationCount;
	unreadCount = this.context.unreadCount;
	unreadByPriority = this.context.unreadByPriority;
	badgePriorityClass = this.context.badgePriorityClass;

	// * Computed: show "mark all unread" when some are already read.
	hasReadNotifications = computed(() => {
		const total = this.notificationCount();
		const unread = this.unreadCount();
		return total > unread;
	});

	onMarkAllAsRead(): void {
		// * Bulk action: mark all as read.
		this.context.markAllAsRead();
	}

	onMarkAllAsUnread(): void {
		// * Bulk action: mark all as unread.
		this.context.markAllAsUnread();
	}

	onDismissAll(): void {
		// * Bulk action: dismiss all notifications.
		this.context.dismissAll();
	}
}
