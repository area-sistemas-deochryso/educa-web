import { Injectable, signal, inject, PLATFORM_ID, computed, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
	SeasonalNotification,
	NotificationType,
	NotificationPriority,
} from './notifications.config';
import { logger } from '@app/core/helpers';
import { StorageService } from '@app/core/services/storage';
import { TimerManager } from '@app/core/services/destroy';
import { SmartNotificationService } from './smart-notification.service';
import { environment } from '@config/environment';
import { NotificacionActiva } from '@core/services/notificaciones-admin';

/**
 * Count of notifications by priority.
 */
export interface PriorityCount {
	urgent: number;
	high: number;
	medium: number;
	low: number;
}

/**
 * Notifications service for seasonal and local notifications.
 *
 * Responsibilities:
 * - Reactive notification state via signals and computed values
 * - Persist read and dismissed notifications with daily reset
 * - Periodic checks for new notifications
 * - Audio feedback and Browser Notification API
 * - Service Worker message handling for push events
 */
@Injectable({
	providedIn: 'root',
})
export class NotificationsService {
	// #region Dependencies
	private platformId = inject(PLATFORM_ID);
	private http = inject(HttpClient);
	private storage = inject(StorageService);
	private router = inject(Router);
	private smartService = inject(SmartNotificationService);
	private timerManager = new TimerManager();
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/notificaciones`;
	// #endregion

	// #region Private state
	private readonly _activeNotifications = signal<SeasonalNotification[]>([]);
	private readonly _dismissedNotifications = signal<SeasonalNotification[]>([]);
	private readonly _readIds = signal<Set<string>>(new Set());
	private readonly _dismissedIds = signal<Set<string>>(new Set());
	private readonly _isPanelOpen = signal(false);
	private readonly _showDismissedHistory = signal(false);

	private notificationSound: HTMLAudioElement | null = null;
	private swMessageHandler: ((event: MessageEvent) => void) | null = null;
	private hasPlayedSound = false;
	// #endregion

	// #region Public readonly state
	readonly activeNotifications = this._activeNotifications.asReadonly();
	readonly dismissedNotifications = this._dismissedNotifications.asReadonly();
	readonly isPanelOpen = this._isPanelOpen.asReadonly();
	readonly showDismissedHistory = this._showDismissedHistory.asReadonly();
	// #endregion

	// #region Computed
	readonly count = computed(() => this._activeNotifications().length);
	readonly dismissedCount = computed(() => this._dismissedNotifications().length);

	readonly unreadCount = computed(() => {
		const readIds = this._readIds();
		return this._activeNotifications().filter((n) => !readIds.has(n.id)).length;
	});

	readonly hasUnread = computed(() => this.unreadCount() > 0);

	readonly unreadByPriority = computed<PriorityCount>(() => {
		const readIds = this._readIds();
		const unread = this._activeNotifications().filter((n) => !readIds.has(n.id));
		const counts: PriorityCount = { urgent: 0, high: 0, medium: 0, low: 0 };
		unread.forEach((n) => counts[n.priority]++);
		return counts;
	});

	readonly highestPriority = computed<NotificationPriority | null>(() => {
		const counts = this.unreadByPriority();
		if (counts.urgent > 0) return 'urgent';
		if (counts.high > 0) return 'high';
		if (counts.medium > 0) return 'medium';
		if (counts.low > 0) return 'low';
		return null;
	});
	// #endregion

	// #region Initialization
	constructor() {
		if (isPlatformBrowser(this.platformId)) {
			this.initSound();
			this.loadDismissedFromStorage();
			this.loadReadFromStorage();
			this.checkNotifications();
			this.startPeriodicCheck();
			this.listenToServiceWorker();
			this.watchSmartInit();
		}
	}

	/**
	 * Initialize audio for notification sound.
	 */
	private initSound(): void {
		this.notificationSound = new Audio();
		this.notificationSound.src = 'sounds/notification-bell.mp3';
		this.notificationSound.volume = 0.5;
	}

	/**
	 * Start periodic checks for notifications.
	 * Runs every 5 min to keep smart notifications (upcoming classes) fresh.
	 */
	private startPeriodicCheck(): void {
		this.timerManager.setInterval(() => this.checkNotifications(), 5 * 60 * 1000);
	}
	/**
	 * Re-check notifications once smart data finishes loading from IndexedDB.
	 */
	private watchSmartInit(): void {
		effect(() => {
			if (this.smartService.initialized()) {
				this.checkNotifications();
			}
		});
	}
	// #endregion

	// #region Notification checks

	/**
	 * Fetch active notifications from API, merge with smart notifications,
	 * filter dismissed, and sort by priority.
	 */
	checkNotifications(): void {
		this.http.get<NotificacionActiva[]>(`${this.apiUrl}/activas`).subscribe({
			next: (response) => {
				const apiNotifications = (response ?? []).map((n) => this.mapApiToSeasonal(n));
				this.applyNotifications(apiNotifications);
			},
			error: () => {
				// Si la API falla, continuar solo con smart notifications
				this.applyNotifications([]);
			},
		});
	}

	/** Maps API DTO to SeasonalNotification shape used by the UI. */
	private mapApiToSeasonal(n: NotificacionActiva): SeasonalNotification {
		return {
			id: `api-${n.id}`,
			type: (n.tipo as NotificationType) || 'evento',
			title: n.titulo,
			message: n.mensaje,
			icon: n.icono,
			priority: (n.prioridad as NotificationPriority) || 'low',
			shouldShow: () => true,
			actionUrl: n.actionUrl ?? undefined,
			actionText: n.actionText ?? undefined,
			dismissible: n.dismissible,
		};
	}

	/** Merges API + smart notifications and updates state. */
	private applyNotifications(apiNotifications: SeasonalNotification[]): void {
		const dismissedIds = this._dismissedIds();

		// Merge smart notifications as SeasonalNotification shape
		const smartNotifs: SeasonalNotification[] = this.smartService.smartNotifications().map((sn) => ({
			...sn,
			shouldShow: () => true,
		}));
		const allNotifications = [...apiNotifications, ...smartNotifs];

		const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
		const active = allNotifications
			.filter((n) => !dismissedIds.has(n.id))
			.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
		const dismissed = allNotifications.filter((n) => dismissedIds.has(n.id));

		this._activeNotifications.set(active);
		this._dismissedNotifications.set(dismissed);

		// Save last check time.
		this.storage.setLastNotificationCheck(new Date().toISOString());

		// Play sound if there are unread notifications and it has not played yet.
		if (this.unreadCount() > 0 && !this.hasPlayedSound) {
			this.playSound();
			this.hasPlayedSound = true;
		}

		// Request browser notification permission if there are urgent items.
		if (active.some((n) => n.priority === 'urgent')) {
			this.requestBrowserNotificationPermission();
		}
	}
	// #endregion

	// #region Commands - read

	/**
	 * Mark a notification as read.
	 */
	markAsRead(notificationId: string): void {
		if (this._readIds().has(notificationId)) return;
		this._readIds.update((ids) => new Set([...ids, notificationId]));
		this.saveReadToStorage();
	}

	/**
	 * Mark a notification as unread.
	 */
	markAsUnread(notificationId: string): void {
		if (!this._readIds().has(notificationId)) return;
		this._readIds.update((ids) => {
			const next = new Set(ids);
			next.delete(notificationId);
			return next;
		});
		this.saveReadToStorage();
	}

	/**
	 * Mark all active notifications as read.
	 */
	markAllAsRead(): void {
		const allIds = this._activeNotifications().map((n) => n.id);
		this._readIds.update((ids) => new Set([...ids, ...allIds]));
		this.saveReadToStorage();
	}

	/**
	 * Mark all notifications as unread.
	 */
	markAllAsUnread(): void {
		this._readIds.set(new Set());
		this.saveReadToStorage();
	}

	/**
	 * Check if a notification is read.
	 */
	isRead(notificationId: string): boolean {
		return this._readIds().has(notificationId);
	}
	// #endregion

	// #region Commands - dismiss

	/**
	 * Dismiss a notification by id.
	 */
	dismiss(notificationId: string): void {
		const notification = this._activeNotifications().find((n) => n.id === notificationId);
		if (!notification || notification.dismissible === false) return;

		this._dismissedIds.update((ids) => new Set([...ids, notificationId]));
		this._activeNotifications.update((list) => list.filter((n) => n.id !== notificationId));
		this._dismissedNotifications.update((list) => [...list, notification]);
		this.saveDismissedToStorage();
	}

	/**
	 * Dismiss all dismissible notifications.
	 */
	dismissAll(): void {
		const active = this._activeNotifications();
		const dismissible = active.filter((n) => n.dismissible !== false);
		const remaining = active.filter((n) => n.dismissible === false);

		this._dismissedIds.update((ids) => new Set([...ids, ...dismissible.map((n) => n.id)]));
		this._activeNotifications.set(remaining);
		this._dismissedNotifications.update((list) => [...list, ...dismissible]);
		this.saveDismissedToStorage();
	}

	/**
	 * Restore a dismissed notification.
	 */
	restore(notificationId: string): void {
		if (!this._dismissedIds().has(notificationId)) return;
		this._dismissedIds.update((ids) => {
			const next = new Set(ids);
			next.delete(notificationId);
			return next;
		});
		this.saveDismissedToStorage();
		this.checkNotifications();
	}

	/**
	 * Restore all dismissed notifications.
	 */
	restoreAll(): void {
		this._dismissedIds.set(new Set());
		this.saveDismissedToStorage();
		this.checkNotifications();
	}
	// #endregion

	// #region Commands - UI

	/**
	 * Toggle the notification panel.
	 */
	togglePanel(): void {
		this._isPanelOpen.update((v) => !v);
		if (this._isPanelOpen() && this.unreadCount() > 0) {
			this.playSound();
		}
	}

	/**
	 * Close the notification panel.
	 */
	closePanel(): void {
		this._isPanelOpen.set(false);
	}

	/**
	 * Toggle dismissed history visibility.
	 */
	toggleDismissedHistory(): void {
		this._showDismissedHistory.update((v) => !v);
	}

	/**
	 * Get active notifications by type.
	 */
	getByType(type: NotificationType): SeasonalNotification[] {
		return this._activeNotifications().filter((n) => n.type === type);
	}
	// #endregion

	// #region Audio and browser notifications

	/**
	 * Play notification sound if available.
	 */
	playSound(): void {
		if (this.notificationSound) {
			this.notificationSound.currentTime = 0;
			this.notificationSound.play().catch(() => {
				// Autoplay may be blocked before user interaction.
			});
		}
	}

	/**
	 * Request browser notification permission.
	 */
	private async requestBrowserNotificationPermission(): Promise<void> {
		if (!('Notification' in window) || Notification.permission !== 'default') return;
		await Notification.requestPermission();
	}

	/**
	 * Show a browser notification for a seasonal notification.
	 */
	async showBrowserNotification(notification: SeasonalNotification): Promise<void> {
		if (!('Notification' in window) || Notification.permission !== 'granted') return;

		try {
			const browserNotif = new Notification(notification.title, {
				body: notification.message,
				icon: '/images/common/icono.png',
				tag: notification.id,
				requireInteraction: notification.priority === 'urgent',
			});

			browserNotif.onclick = () => {
				window.focus();
				if (notification.actionUrl) {
					this.router.navigateByUrl(notification.actionUrl);
				}
				browserNotif.close();
			};
		} catch (e) {
			logger.error('[Notifications] Error showing browser notification:', e);
		}
	}

	/**
	 * Show urgent notifications as browser notifications.
	 */
	showUrgentAsBrowserNotifications(): void {
		const urgent = this._activeNotifications().filter((n) => n.priority === 'urgent');
		urgent.forEach((n) => this.showBrowserNotification(n));
	}
	// #endregion

	// #region Service Worker

	/**
	 * Listen to Service Worker messages.
	 */
	private listenToServiceWorker(): void {
		if (!('serviceWorker' in navigator)) return;

		this.swMessageHandler = (event: MessageEvent) => {
			const { type, payload } = event.data || {};

			switch (type) {
				case 'PUSH_RECEIVED':
					this.handlePushReceived(payload);
					break;
				case 'NOTIFICATION_CLICKED':
					this.handleNotificationClicked(payload);
					break;
				case 'NOTIFICATION_CLOSED':
					break;
			}
		};

		navigator.serviceWorker.addEventListener('message', this.swMessageHandler);
	}

	/**
	 * Handle push received message.
	 */
	private handlePushReceived(_payload: unknown): void {
		this.playSound();
		this.checkNotifications();
	}

	/**
	 * Handle notification clicked message.
	 */
	private handleNotificationClicked(payload: unknown): void {
		const typedPayload = payload as { id?: string } | null;
		if (typedPayload?.id) {
			this.markAsRead(typedPayload.id);
		}
	}
	// #endregion

	// #region Storage I/O

	/**
	 * Load dismissed notifications from storage.
	 */
	private loadDismissedFromStorage(): void {
		try {
			const data = this.storage.getDismissedNotifications();
			if (data) {
				const isToday = new Date(data.date).toDateString() === new Date().toDateString();
				if (isToday) {
					this._dismissedIds.set(new Set(data.ids));
				} else {
					this.storage.removeDismissedNotifications();
				}
			}
		} catch (e) {
			logger.error('[Notifications] Error loading dismissed:', e);
			this.storage.removeDismissedNotifications();
		}
	}

	/**
	 * Save dismissed notifications to storage.
	 */
	private saveDismissedToStorage(): void {
		try {
			this.storage.setDismissedNotifications({
				ids: [...this._dismissedIds()],
				date: new Date().toISOString(),
			});
		} catch (e) {
			logger.error('[Notifications] Error saving dismissed:', e);
		}
	}

	/**
	 * Load read notifications from storage.
	 */
	private loadReadFromStorage(): void {
		try {
			const data = this.storage.getReadNotifications();
			if (data) {
				const isToday = new Date(data.date).toDateString() === new Date().toDateString();
				if (isToday) {
					this._readIds.set(new Set(data.ids));
				} else {
					this.storage.removeReadNotifications();
				}
			}
		} catch (e) {
			logger.error('[Notifications] Error loading read:', e);
			this.storage.removeReadNotifications();
		}
	}

	/**
	 * Save read notifications to storage.
	 */
	private saveReadToStorage(): void {
		try {
			this.storage.setReadNotifications({
				ids: [...this._readIds()],
				date: new Date().toISOString(),
			});
		} catch (e) {
			logger.error('[Notifications] Error saving read:', e);
		}
	}
	// #endregion

	// #region Cleanup

	/**
	 * Cleanup timers and Service Worker listeners.
	 */
	cleanup(): void {
		this.timerManager.clearAll();

		if (this.swMessageHandler && 'serviceWorker' in navigator) {
			navigator.serviceWorker.removeEventListener('message', this.swMessageHandler);
			this.swMessageHandler = null;
		}
	}
	// #endregion
}
