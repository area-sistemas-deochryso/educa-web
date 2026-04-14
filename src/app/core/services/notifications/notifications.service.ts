import { Injectable, signal, inject, PLATFORM_ID, computed, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
	SeasonalNotification,
	NotificationType,
	NotificationPriority,
} from './notifications.config';
import { Duration } from '@core/helpers';
import { StorageService } from '@core/services/storage';
import { TimerManager } from '@core/services/destroy';
import { SmartNotificationService } from './smart-notification.service';
import { NotificationsApiService } from './notifications-api.service';
import { NotificationsSoundService } from './notifications-sound.service';
import { loadDailyIdSet, saveDailyIdSet } from './notifications-persistence.helper';
import { NotificacionActiva } from '@data/models';

export interface PriorityCount {
	urgent: number;
	high: number;
	medium: number;
	low: number;
}

@Injectable({
	providedIn: 'root',
})
export class NotificationsService {
	// #region Dependencies
	private readonly platformId = inject(PLATFORM_ID);
	private readonly api = inject(NotificationsApiService);
	private readonly sound = inject(NotificationsSoundService);
	private readonly storage = inject(StorageService);
	private readonly smartService = inject(SmartNotificationService);
	private readonly timerManager = new TimerManager();
	// #endregion

	// #region Private state
	private readonly _activeNotifications = signal<SeasonalNotification[]>([]);
	private readonly _dismissedNotifications = signal<SeasonalNotification[]>([]);
	private readonly _readIds = signal<Set<string>>(new Set());
	private readonly _dismissedIds = signal<Set<string>>(new Set());
	private readonly _isPanelOpen = signal(false);
	private readonly _showDismissedHistory = signal(false);

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
			this.loadDismissedFromStorage();
			this.loadReadFromStorage();
			this.checkNotifications();
			this.startPeriodicCheck();
			this.listenToServiceWorker();
			this.watchSmartInit();
		}
	}

	// Runs every 5 min to keep smart notifications (upcoming classes) fresh.
	private startPeriodicCheck(): void {
		this.timerManager.setInterval(() => this.checkNotifications(), Duration.minutes(5).ms);
	}

	// Re-check notifications once smart data finishes loading from IndexedDB.
	private watchSmartInit(): void {
		effect(() => {
			if (this.smartService.initialized()) {
				this.checkNotifications();
			}
		});
	}
	// #endregion

	// #region Notification checks
	checkNotifications(): void {
		this.api.getActivas().subscribe({
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

	private applyNotifications(apiNotifications: SeasonalNotification[]): void {
		const dismissedIds = this._dismissedIds();

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

		this.storage.setLastNotificationCheck(new Date().toISOString());

		// Play sound if there are unread notifications and it has not played yet
		if (this.unreadCount() > 0 && !this.hasPlayedSound) {
			this.sound.playSound();
			this.hasPlayedSound = true;
		}

		// Request browser notification permission if there are urgent items
		if (active.some((n) => n.priority === 'urgent')) {
			this.sound.requestPermission();
		}
	}
	// #endregion

	// #region Commands - read
	markAsRead(notificationId: string): void {
		if (this._readIds().has(notificationId)) return;
		this._readIds.update((ids) => new Set([...ids, notificationId]));
		this.saveReadToStorage();
	}

	markAsUnread(notificationId: string): void {
		if (!this._readIds().has(notificationId)) return;
		this._readIds.update((ids) => {
			const next = new Set(ids);
			next.delete(notificationId);
			return next;
		});
		this.saveReadToStorage();
	}

	markAllAsRead(): void {
		const allIds = this._activeNotifications().map((n) => n.id);
		this._readIds.update((ids) => new Set([...ids, ...allIds]));
		this.saveReadToStorage();
	}

	markAllAsUnread(): void {
		this._readIds.set(new Set());
		this.saveReadToStorage();
	}

	isRead(notificationId: string): boolean {
		return this._readIds().has(notificationId);
	}
	// #endregion

	// #region Commands - dismiss
	dismiss(notificationId: string): void {
		const notification = this._activeNotifications().find((n) => n.id === notificationId);
		if (!notification || notification.dismissible === false) return;

		this._dismissedIds.update((ids) => new Set([...ids, notificationId]));
		this._activeNotifications.update((list) => list.filter((n) => n.id !== notificationId));
		this._dismissedNotifications.update((list) => [...list, notification]);
		this.saveDismissedToStorage();
	}

	dismissAll(): void {
		const active = this._activeNotifications();
		const dismissible = active.filter((n) => n.dismissible !== false);
		const remaining = active.filter((n) => n.dismissible === false);

		this._dismissedIds.update((ids) => new Set([...ids, ...dismissible.map((n) => n.id)]));
		this._activeNotifications.set(remaining);
		this._dismissedNotifications.update((list) => [...list, ...dismissible]);
		this.saveDismissedToStorage();
	}

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

	restoreAll(): void {
		this._dismissedIds.set(new Set());
		this.saveDismissedToStorage();
		this.checkNotifications();
	}
	// #endregion

	// #region Commands - UI
	togglePanel(): void {
		this._isPanelOpen.update((v) => !v);
		if (this._isPanelOpen() && this.unreadCount() > 0) {
			this.sound.playSound();
		}
	}

	closePanel(): void {
		this._isPanelOpen.set(false);
	}

	toggleDismissedHistory(): void {
		this._showDismissedHistory.update((v) => !v);
	}

	getByType(type: NotificationType): SeasonalNotification[] {
		return this._activeNotifications().filter((n) => n.type === type);
	}
	// #endregion

	// #region Audio and browser notifications (delegated)
	playSound(): void {
		this.sound.playSound();
	}

	async showBrowserNotification(notification: SeasonalNotification): Promise<void> {
		await this.sound.showBrowserNotification(notification);
	}

	showUrgentAsBrowserNotifications(): void {
		this.sound.showUrgentAsBrowserNotifications(this._activeNotifications());
	}
	// #endregion

	// #region Service Worker
	private listenToServiceWorker(): void {
		if (!('serviceWorker' in navigator)) return;

		this.swMessageHandler = (event: MessageEvent) => {
			const { type, payload } = event.data || {};

			switch (type) {
				case 'PUSH_RECEIVED':
					this.handlePushReceived();
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

	private handlePushReceived(): void {
		this.sound.playSound();
		this.checkNotifications();
	}

	private handleNotificationClicked(payload: unknown): void {
		const typedPayload = payload as { id?: string } | null;
		if (typedPayload?.id) {
			this.markAsRead(typedPayload.id);
		}
	}
	// #endregion

	// #region Storage I/O
	private loadDismissedFromStorage(): void {
		this._dismissedIds.set(loadDailyIdSet(this.storage, 'dismissed'));
	}

	private saveDismissedToStorage(): void {
		saveDailyIdSet(this.storage, 'dismissed', this._dismissedIds());
	}

	private loadReadFromStorage(): void {
		this._readIds.set(loadDailyIdSet(this.storage, 'read'));
	}

	private saveReadToStorage(): void {
		saveDailyIdSet(this.storage, 'read', this._readIds());
	}
	// #endregion

	// #region Cleanup
	cleanup(): void {
		this.timerManager.clearAll();

		if (this.swMessageHandler && 'serviceWorker' in navigator) {
			navigator.serviceWorker.removeEventListener('message', this.swMessageHandler);
			this.swMessageHandler = null;
		}
	}
	// #endregion
}
