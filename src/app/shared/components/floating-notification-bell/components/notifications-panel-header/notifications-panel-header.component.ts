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
	private context = inject(NotificationsPanelContext);

	notificationCount = this.context.notificationCount;
	unreadCount = this.context.unreadCount;
	unreadByPriority = this.context.unreadByPriority;
	badgePriorityClass = this.context.badgePriorityClass;

	// Computed: hay notificaciones leídas (para mostrar botón "marcar todas como no leídas")
	hasReadNotifications = computed(() => {
		const total = this.notificationCount();
		const unread = this.unreadCount();
		return total > unread;
	});

	onMarkAllAsRead(): void {
		this.context.markAllAsRead();
	}

	onMarkAllAsUnread(): void {
		this.context.markAllAsUnread();
	}

	onDismissAll(): void {
		this.context.dismissAll();
	}
}
