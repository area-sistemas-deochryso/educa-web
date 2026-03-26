import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { logger } from '@core/helpers';
import type { SeasonalNotification } from './notifications.types';

/**
 * Handles audio playback and Browser Notification API.
 * No state — pure side-effect service for sound and browser notifications.
 */
@Injectable({
	providedIn: 'root',
})
export class NotificationsSoundService {
	// #region Dependencies
	private readonly platformId = inject(PLATFORM_ID);
	private readonly router = inject(Router);
	private notificationSound: HTMLAudioElement | null = null;
	// #endregion

	// #region Initialization
	constructor() {
		if (isPlatformBrowser(this.platformId)) {
			this.initSound();
		}
	}

	private initSound(): void {
		this.notificationSound = new Audio();
		this.notificationSound.src = 'sounds/notification-bell.mp3';
		this.notificationSound.volume = 0.5;
	}
	// #endregion

	// #region Audio playback
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
	// #endregion

	// #region Browser Notification API
	/**
	 * Request browser notification permission if not yet granted.
	 */
	async requestPermission(): Promise<void> {
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
	 * Show browser notifications for a list of urgent notifications.
	 */
	showUrgentAsBrowserNotifications(notifications: SeasonalNotification[]): void {
		const urgent = notifications.filter((n) => n.priority === 'urgent');
		urgent.forEach((n) => this.showBrowserNotification(n));
	}
	// #endregion
}
