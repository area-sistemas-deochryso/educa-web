import { Injectable, signal, inject, PLATFORM_ID, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
	SeasonalNotification,
	NotificationType,
	NotificationPriority,
	getTodayNotifications,
} from './notifications.config';
import { logger } from '@app/core/helpers';
import { StorageService } from '@app/core/services/storage';
import { TimerManager } from '@app/core/services/destroy';

/** Conteo por prioridad */
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
	private platformId = inject(PLATFORM_ID);
	private storage = inject(StorageService);

	/** Timer manager para gestionar intervalos y timeouts */
	private timerManager = new TimerManager();

	/** Listener del Service Worker para cleanup */
	private swMessageHandler: ((event: MessageEvent) => void) | null = null;

	/** Notificaciones activas para mostrar */
	readonly activeNotifications = signal<SeasonalNotification[]>([]);

	/** Indica si hay notificaciones sin leer */
	readonly hasUnread = signal(false);

	/** Contador de notificaciones */
	readonly count = signal(0);

	/** Contador de no leídas */
	readonly unreadCount = signal(0);

	/** Panel de notificaciones abierto */
	readonly isPanelOpen = signal(false);

	/** Notificaciones descartadas del día */
	readonly dismissedNotifications = signal<SeasonalNotification[]>([]);

	/** Contador de descartadas */
	readonly dismissedCount = computed(() => this.dismissedNotifications().length);

	/** Mostrar historial de descartadas */
	readonly showDismissedHistory = signal(false);

	/** Conteo por prioridad de notificaciones no leídas */
	readonly unreadByPriority = signal<PriorityCount>({ urgent: 0, high: 0, medium: 0, low: 0 });

	/** Prioridad más alta de las no leídas */
	readonly highestPriority = computed<NotificationPriority | null>(() => {
		const counts = this.unreadByPriority();
		if (counts.urgent > 0) return 'urgent';
		if (counts.high > 0) return 'high';
		if (counts.medium > 0) return 'medium';
		if (counts.low > 0) return 'low';
		return null;
	});

	/** Audio para sonido de notificación */
	private notificationSound: HTMLAudioElement | null = null;

	private dismissedIds: Set<string> = new Set();
	private readIds: Set<string> = new Set();
	private hasPlayedSound = false;

	constructor() {
		if (isPlatformBrowser(this.platformId)) {
			this.initSound();
			this.loadDismissedNotifications();
			this.loadReadNotifications();
			this.checkNotifications();
			this.startPeriodicCheck();
			this.listenToServiceWorker();
		}
	}

	/**
	 * Inicializa el sonido de notificación
	 */
	private initSound(): void {
		this.notificationSound = new Audio();
		// Usar archivo MP3 de sonido de campana
		this.notificationSound.src = 'sounds/notification-bell.mp3';
		this.notificationSound.volume = 0.5;
	}

	/**
	 * Escucha mensajes del Service Worker (Push notifications)
	 * Push es el wake-up call - el SW nos notifica cuando llega algo
	 */
	private listenToServiceWorker(): void {
		if (!('serviceWorker' in navigator)) {
			logger.warn('[Notifications] Service Worker no soportado');
			return;
		}

		// Guardar referencia al handler para poder removerlo después
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
					this.handleNotificationClosed(payload);
					break;
				default:
					logger.log('[Notifications] SW message:', event.data);
			}
		};

		navigator.serviceWorker.addEventListener('message', this.swMessageHandler);
		logger.log('[Notifications] Escuchando mensajes del Service Worker');
	}

	/**
	 * Maneja la recepción de un Push
	 * Reproduce sonido y actualiza estado
	 */
	private handlePushReceived(payload: unknown): void {
		logger.log('[Notifications] Push recibido:', payload);

		// Reproducir sonido de notificación
		this.playSound();

		// Incrementar contador de no leídas
		this.unreadCount.update((count) => count + 1);
		this.hasUnread.set(true);

		// Actualizar conteo por prioridad si viene en el payload
		const typedPayload = payload as { priority?: NotificationPriority } | null;
		if (typedPayload?.priority) {
			this.unreadByPriority.update((counts) => ({
				...counts,
				[typedPayload.priority!]:
					(counts[typedPayload.priority as keyof PriorityCount] || 0) + 1,
			}));
		}

		// Re-verificar notificaciones locales también
		this.checkNotifications();
	}

	/**
	 * Maneja click en notificación nativa
	 */
	private handleNotificationClicked(payload: unknown): void {
		logger.log('[Notifications] Notification clicked:', payload);

		// Marcar como leída si tiene ID
		const typedPayload = payload as { id?: string } | null;
		if (typedPayload?.id) {
			this.markAsRead(typedPayload.id);
		}

		// Navegar a la URL si se especificó (la navegación la maneja el SW)
	}

	/**
	 * Maneja cierre de notificación sin click
	 */
	private handleNotificationClosed(payload: unknown): void {
		logger.log('[Notifications] Notification closed:', payload);
		// Opcional: marcar como leída o dejar sin leer
	}

	/**
	 * Carga las notificaciones descartadas del localStorage
	 */
	private loadDismissedNotifications(): void {
		try {
			const data = this.storage.getDismissedNotifications();
			if (data) {
				// Limpiar descartados del día anterior
				const storedDate = new Date(data.date).toDateString();
				const today = new Date().toDateString();

				if (storedDate === today) {
					this.dismissedIds = new Set(data.ids);
				} else {
					// Nuevo día, limpiar descartados
					this.clearDismissed();
				}
			}
		} catch (e) {
			logger.error('[Notifications] Error loading dismissed:', e);
			this.clearDismissed();
		}
	}

	/**
	 * Guarda las notificaciones descartadas
	 */
	private saveDismissedNotifications(): void {
		try {
			this.storage.setDismissedNotifications({
				ids: Array.from(this.dismissedIds),
				date: new Date().toISOString(),
			});
		} catch (e) {
			logger.error('[Notifications] Error saving dismissed:', e);
		}
	}

	/**
	 * Limpia las notificaciones descartadas
	 */
	private clearDismissed(): void {
		this.dismissedIds.clear();
		this.storage.removeDismissedNotifications();
	}

	/**
	 * Carga las notificaciones leídas del localStorage
	 */
	private loadReadNotifications(): void {
		try {
			const data = this.storage.getReadNotifications();
			if (data) {
				const storedDate = new Date(data.date).toDateString();
				const today = new Date().toDateString();

				if (storedDate === today) {
					this.readIds = new Set(data.ids);
				} else {
					this.clearRead();
				}
			}
		} catch (e) {
			logger.error('[Notifications] Error loading read:', e);
			this.clearRead();
		}
	}

	/**
	 * Guarda las notificaciones leídas
	 */
	private saveReadNotifications(): void {
		try {
			this.storage.setReadNotifications({
				ids: Array.from(this.readIds),
				date: new Date().toISOString(),
			});
		} catch (e) {
			logger.error('[Notifications] Error saving read:', e);
		}
	}

	/**
	 * Limpia las notificaciones leídas
	 */
	private clearRead(): void {
		this.readIds.clear();
		this.storage.removeReadNotifications();
	}

	/**
	 * Verifica las notificaciones del día
	 */
	checkNotifications(): void {
		const today = new Date();
		const todayNotifications = getTodayNotifications(today);

		// Filtrar las que ya fueron descartadas
		const active = todayNotifications.filter((n) => !this.dismissedIds.has(n.id));

		// Obtener las descartadas
		const dismissed = todayNotifications.filter((n) => this.dismissedIds.has(n.id));
		this.dismissedNotifications.set(dismissed);

		// Ordenar por prioridad
		const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
		active.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

		// Contar no leídas
		const unread = active.filter((n) => !this.readIds.has(n.id));

		// Calcular conteo por prioridad
		const priorityCounts: PriorityCount = { urgent: 0, high: 0, medium: 0, low: 0 };
		unread.forEach((n) => {
			priorityCounts[n.priority]++;
		});

		this.activeNotifications.set(active);
		this.count.set(active.length);
		this.unreadCount.set(unread.length);
		this.hasUnread.set(unread.length > 0);
		this.unreadByPriority.set(priorityCounts);

		logger.log(
			`[Notifications] ${active.length} activas, ${unread.length} sin leer`,
			priorityCounts,
		);

		// Guardar última verificación
		this.storage.setLastNotificationCheck(today.toISOString());

		// Reproducir sonido si hay no leídas y no se ha reproducido aún
		if (unread.length > 0 && !this.hasPlayedSound) {
			this.playSound();
			this.hasPlayedSound = true;
		}

		// Solicitar permiso para notificaciones del navegador si hay urgentes
		if (active.some((n) => n.priority === 'urgent')) {
			this.requestBrowserNotificationPermission();
		}
	}

	/**
	 * Inicia verificación periódica (cada hora)
	 */
	private startPeriodicCheck(): void {
		// Verificar cada hora usando TimerManager
		this.timerManager.setInterval(
			() => {
				this.checkNotifications();
			},
			60 * 60 * 1000,
		);
	}

	/**
	 * Reproduce el sonido de notificación
	 */
	playSound(): void {
		if (this.notificationSound) {
			this.notificationSound.currentTime = 0;
			this.notificationSound.play().catch((e) => {
				logger.warn('[Notifications] No se pudo reproducir sonido:', e);
			});
		}
	}

	/**
	 * Actualiza el conteo por prioridad basado en notificaciones no leídas
	 */
	private updatePriorityCounts(): void {
		const unread = this.activeNotifications().filter((n) => !this.readIds.has(n.id));
		const priorityCounts: PriorityCount = { urgent: 0, high: 0, medium: 0, low: 0 };
		unread.forEach((n) => {
			priorityCounts[n.priority]++;
		});
		this.unreadByPriority.set(priorityCounts);
	}

	/**
	 * Marca una notificación como leída
	 */
	markAsRead(notificationId: string): void {
		if (!this.readIds.has(notificationId)) {
			this.readIds.add(notificationId);
			this.saveReadNotifications();

			const unread = this.activeNotifications().filter((n) => !this.readIds.has(n.id));
			this.unreadCount.set(unread.length);
			this.hasUnread.set(unread.length > 0);
			this.updatePriorityCounts();

			logger.log(`[Notifications] Leída: ${notificationId}`);
		}
	}

	/**
	 * Marca una notificación como no leída
	 */
	markAsUnread(notificationId: string): void {
		if (this.readIds.has(notificationId)) {
			this.readIds.delete(notificationId);
			this.saveReadNotifications();

			const unread = this.activeNotifications().filter((n) => !this.readIds.has(n.id));
			this.unreadCount.set(unread.length);
			this.hasUnread.set(unread.length > 0);
			this.updatePriorityCounts();

			logger.log(`[Notifications] No leída: ${notificationId}`);
		}
	}

	/**
	 * Marca todas como leídas
	 */
	markAllAsRead(): void {
		this.activeNotifications().forEach((n) => this.readIds.add(n.id));
		this.saveReadNotifications();
		this.unreadCount.set(0);
		this.hasUnread.set(false);
		this.unreadByPriority.set({ urgent: 0, high: 0, medium: 0, low: 0 });
		logger.log('[Notifications] Todas marcadas como leídas');
	}

	/**
	 * Marca todas como no leídas
	 */
	markAllAsUnread(): void {
		this.readIds.clear();
		this.saveReadNotifications();
		const active = this.activeNotifications();
		this.unreadCount.set(active.length);
		this.hasUnread.set(active.length > 0);
		this.updatePriorityCounts();
		logger.log('[Notifications] Todas marcadas como no leídas');
	}

	/**
	 * Verifica si una notificación está leída
	 */
	isRead(notificationId: string): boolean {
		return this.readIds.has(notificationId);
	}

	/**
	 * Abre/cierra el panel de notificaciones
	 */
	togglePanel(): void {
		this.isPanelOpen.update((v) => !v);
		if (this.isPanelOpen() && this.unreadCount() > 0) {
			this.playSound();
		}
	}

	/**
	 * Cierra el panel
	 */
	closePanel(): void {
		this.isPanelOpen.set(false);
	}

	/**
	 * Descarta una notificación
	 */
	dismiss(notificationId: string): void {
		const notification = this.activeNotifications().find((n) => n.id === notificationId);

		// Solo descartar si es dismissible
		if (notification?.dismissible !== false && notification) {
			this.dismissedIds.add(notificationId);
			this.saveDismissedNotifications();

			// Actualizar lista activa
			const updated = this.activeNotifications().filter((n) => n.id !== notificationId);
			this.activeNotifications.set(updated);
			this.count.set(updated.length);

			// Actualizar lista de descartadas
			this.dismissedNotifications.update((dismissed) => [...dismissed, notification]);

			// Actualizar no leídas
			const unread = updated.filter((n) => !this.readIds.has(n.id));
			this.unreadCount.set(unread.length);
			this.hasUnread.set(unread.length > 0);
			this.updatePriorityCounts();

			logger.log(`[Notifications] Descartada: ${notificationId}`);
		}
	}

	/**
	 * Descarta todas las notificaciones (excepto las no dismissible)
	 */
	dismissAll(): void {
		const active = this.activeNotifications();
		const newlyDismissed: SeasonalNotification[] = [];

		active.forEach((n) => {
			if (n.dismissible !== false) {
				this.dismissedIds.add(n.id);
				newlyDismissed.push(n);
			}
		});
		this.saveDismissedNotifications();

		// Mantener solo las no dismissible
		const remaining = active.filter((n) => n.dismissible === false);
		this.activeNotifications.set(remaining);
		this.count.set(remaining.length);

		// Actualizar lista de descartadas
		this.dismissedNotifications.update((dismissed) => [...dismissed, ...newlyDismissed]);

		// Actualizar no leídas
		const unread = remaining.filter((n) => !this.readIds.has(n.id));
		this.unreadCount.set(unread.length);
		this.hasUnread.set(unread.length > 0);
		this.updatePriorityCounts();

		logger.log('[Notifications] Todas descartadas');
	}

	/**
	 * Obtiene notificaciones por tipo
	 */
	getByType(type: NotificationType): SeasonalNotification[] {
		return this.activeNotifications().filter((n) => n.type === type);
	}

	/**
	 * Restaura una notificación descartada
	 */
	restore(notificationId: string): void {
		if (this.dismissedIds.has(notificationId)) {
			this.dismissedIds.delete(notificationId);
			this.saveDismissedNotifications();
			this.checkNotifications();
			logger.log(`[Notifications] Restaurada: ${notificationId}`);
		}
	}

	/**
	 * Restaura todas las notificaciones descartadas
	 */
	restoreAll(): void {
		this.dismissedIds.clear();
		this.saveDismissedNotifications();
		this.checkNotifications();
		logger.log('[Notifications] Todas restauradas');
	}

	/**
	 * Alterna la vista del historial de descartadas
	 */
	toggleDismissedHistory(): void {
		this.showDismissedHistory.update((v) => !v);
	}

	/**
	 * Solicita permiso para notificaciones del navegador
	 */
	private async requestBrowserNotificationPermission(): Promise<void> {
		if (!('Notification' in window)) {
			logger.warn('[Notifications] Browser notifications not supported');
			return;
		}

		if (Notification.permission === 'default') {
			const permission = await Notification.requestPermission();
			logger.log(`[Notifications] Permission: ${permission}`);
		}
	}

	/**
	 * Muestra una notificación nativa del navegador
	 */
	async showBrowserNotification(notification: SeasonalNotification): Promise<void> {
		if (!('Notification' in window) || Notification.permission !== 'granted') {
			return;
		}

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
					window.location.href = notification.actionUrl;
				}
				browserNotif.close();
			};
		} catch (e) {
			logger.error('[Notifications] Error showing browser notification:', e);
		}
	}

	/**
	 * Muestra notificaciones urgentes como notificaciones del navegador
	 */
	showUrgentAsBrowserNotifications(): void {
		const urgent = this.activeNotifications().filter((n) => n.priority === 'urgent');
		urgent.forEach((n) => this.showBrowserNotification(n));
	}

	/**
	 * Limpia recursos al destruir (aunque los servicios singleton raramente se destruyen)
	 * Este método se puede llamar manualmente para cleanup
	 */
	cleanup(): void {
		// Limpiar todos los timers
		this.timerManager.clearAll();

		// Remover listener del Service Worker
		if (this.swMessageHandler && 'serviceWorker' in navigator) {
			navigator.serviceWorker.removeEventListener('message', this.swMessageHandler);
			this.swMessageHandler = null;
		}

		logger.log('[Notifications] Cleanup completado');
	}
}
