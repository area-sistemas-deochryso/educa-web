import { Injectable, Signal, inject, computed } from '@angular/core';
import { NotificationsService, SeasonalNotification, NotificationPriority } from '@core/services';
import { UnreadByPriority } from './components';

/**
 * Context service for the notifications panel and its child components.
 * This eliminates prop drilling by providing direct access to notification state and methods.
 * Must be provided at the floating-notification-bell component level.
 */
@Injectable()
export class NotificationsPanelContext {
	// * Bridge to notifications service for shared panel state/actions.
	private notificationsService = inject(NotificationsService);

	// * Signals - state.
	readonly notifications: Signal<SeasonalNotification[]> =
		this.notificationsService.activeNotifications;
	readonly dismissedNotifications: Signal<SeasonalNotification[]> =
		this.notificationsService.dismissedNotifications;
	readonly notificationCount: Signal<number> = this.notificationsService.count;
	readonly unreadCount: Signal<number> = this.notificationsService.unreadCount;
	readonly dismissedCount: Signal<number> = this.notificationsService.dismissedCount;
	readonly unreadByPriority: Signal<UnreadByPriority> =
		this.notificationsService.unreadByPriority;
	readonly highestPriority: Signal<NotificationPriority | null> =
		this.notificationsService.highestPriority;
	readonly isPanelOpen: Signal<boolean> = this.notificationsService.isPanelOpen;
	readonly showDismissedHistory: Signal<boolean> = this.notificationsService.showDismissedHistory;

	// * Computed signals.
	readonly badgePriorityClass: Signal<string> = computed(() => {
		const priority = this.highestPriority();
		return priority ? `badge-${priority}` : '';
	});

	// * Methods.
	togglePanel(): void {
		this.notificationsService.togglePanel();
	}

	closePanel(): void {
		this.notificationsService.closePanel();
	}

	markAsRead(id: string): void {
		this.notificationsService.markAsRead(id);
	}

	markAsUnread(id: string): void {
		this.notificationsService.markAsUnread(id);
	}

	markAllAsRead(): void {
		this.notificationsService.markAllAsRead();
	}

	markAllAsUnread(): void {
		this.notificationsService.markAllAsUnread();
	}

	isRead(id: string): boolean {
		return this.notificationsService.isRead(id);
	}

	dismiss(id: string): void {
		this.notificationsService.dismiss(id);
	}

	dismissAll(): void {
		this.notificationsService.dismissAll();
	}

	restore(id: string): void {
		this.notificationsService.restore(id);
	}

	restoreAll(): void {
		this.notificationsService.restoreAll();
	}

	toggleDismissedHistory(): void {
		this.notificationsService.toggleDismissedHistory();
	}

	playSound(): void {
		this.notificationsService.playSound();
	}
}
