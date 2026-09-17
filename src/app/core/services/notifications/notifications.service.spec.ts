// * Tests for NotificationsService state changes.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { NotificationsService } from './notifications.service';
import { NotificationsApiService } from './notifications-api.service';
import { NotificationsSoundService } from './notifications-sound.service';
import { SmartNotificationService } from './smart-notification.service';
import { StorageService } from '@app/core/services/storage';
import { environment } from '@config/environment';
import type { NotificacionActiva } from '@data/models';

// Mock Audio
// #endregion
// #region Implementation
class MockAudio {
	src = '';
	volume = 1;
	currentTime = 0;
	play = vi.fn().mockResolvedValue(undefined);
}

// Mock global Audio
vi.stubGlobal('Audio', MockAudio);

describe('NotificationsService', () => {
	let service: NotificationsService;
	let storageMock: Partial<StorageService>;
	let apiMock: { getActivas: ReturnType<typeof vi.fn> };
	let soundMock: {
		playSound: ReturnType<typeof vi.fn>;
		requestPermission: ReturnType<typeof vi.fn>;
		showBrowserNotification: ReturnType<typeof vi.fn>;
		showUrgentAsBrowserNotifications: ReturnType<typeof vi.fn>;
	};
	let smartMock: { initialized: ReturnType<typeof signal<boolean>>; smartNotifications: ReturnType<typeof signal<never[]>> };

	const activa = (overrides: Partial<NotificacionActiva> = {}): NotificacionActiva => ({
		id: 1,
		titulo: 'Título',
		mensaje: 'Mensaje',
		tipo: 'evento',
		prioridad: 'low',
		icono: '',
		actionUrl: null,
		actionText: null,
		dismissible: true,
		...overrides,
	});

	beforeEach(() => {
		storageMock = {
			getDismissedNotificationsAsync: vi.fn().mockResolvedValue(null),
			setDismissedNotificationsAsync: vi.fn().mockResolvedValue(undefined),
			removeDismissedNotifications: vi.fn(),
			getReadNotificationsAsync: vi.fn().mockResolvedValue(null),
			setReadNotificationsAsync: vi.fn().mockResolvedValue(undefined),
			removeReadNotifications: vi.fn(),
			getLastNotificationCheck: vi.fn().mockReturnValue(null),
			setLastNotificationCheck: vi.fn(),
			getUser: vi.fn().mockReturnValue(null),
			getToken: vi.fn().mockReturnValue(null),
		};
		apiMock = { getActivas: vi.fn().mockReturnValue(of([])) };
		soundMock = {
			playSound: vi.fn(),
			requestPermission: vi.fn(),
			showBrowserNotification: vi.fn().mockResolvedValue(undefined),
			showUrgentAsBrowserNotifications: vi.fn(),
		};
		smartMock = { initialized: signal(false), smartNotifications: signal([]) };

		TestBed.configureTestingModule({
			providers: [
				NotificationsService,
				{ provide: StorageService, useValue: storageMock },
				{ provide: NotificationsApiService, useValue: apiMock },
				{ provide: NotificationsSoundService, useValue: soundMock },
				{ provide: SmartNotificationService, useValue: smartMock },
				{ provide: PLATFORM_ID, useValue: 'browser' },
			],
		});

		service = TestBed.inject(NotificationsService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('panel operations', () => {
		it('should have panel closed initially', () => {
			expect(service.isPanelOpen()).toBe(false);
		});

		it('should toggle panel state', () => {
			const initialState = service.isPanelOpen();
			service.togglePanel();
			expect(service.isPanelOpen()).toBe(!initialState);
		});

		it('should close panel', () => {
			service.togglePanel(); // open
			service.closePanel();
			expect(service.isPanelOpen()).toBe(false);
		});
	});

	describe('markAsRead', () => {
		it('should mark notification as read', () => {
			const notificationId = 'test-notification-1';
			service.markAsRead(notificationId);
			expect(service.isRead(notificationId)).toBe(true);
		});
	});

	describe('markAllAsRead', () => {
		it('should set unread count to zero', () => {
			service.markAllAsRead();
			expect(service.unreadCount()).toBe(0);
			expect(service.hasUnread()).toBe(false);
		});
	});

	describe('dismissedHistory', () => {
		it('should toggle dismissed history visibility', () => {
			const initial = service.showDismissedHistory();
			service.toggleDismissedHistory();
			expect(service.showDismissedHistory()).toBe(!initial);
		});
	});

	describe('cleanup', () => {
		it('should cleanup resources without errors', () => {
			expect(() => service.cleanup()).not.toThrow();
		});
	});

	describe('checkNotifications', () => {
		it('loads API notifications sorted urgent-first with derived computeds', () => {
			apiMock.getActivas.mockReturnValue(
				of([activa({ id: 2, prioridad: 'low' }), activa({ id: 1, prioridad: 'urgent' })]),
			);

			service.checkNotifications();

			expect(service.activeNotifications().map((n) => n.id)).toEqual(['api-1', 'api-2']);
			expect(service.count()).toBe(2);
			expect(service.unreadCount()).toBe(2);
			expect(service.hasUnread()).toBe(true);
			expect(service.unreadByPriority()).toEqual({ urgent: 1, high: 0, medium: 0, low: 1 });
			expect(service.highestPriority()).toBe('urgent');
			// Sound plays once for the unread batch + permission for urgent items.
			expect(soundMock.playSound).toHaveBeenCalledTimes(1);
			expect(soundMock.requestPermission).toHaveBeenCalled();
			expect(storageMock.setLastNotificationCheck).toHaveBeenCalled();
		});

		it('falls back to empty when the API fails (no throw, null priority)', () => {
			apiMock.getActivas.mockReturnValue(throwError(() => new Error('down')));

			service.checkNotifications();

			expect(service.activeNotifications()).toEqual([]);
			expect(service.unreadCount()).toBe(0);
			expect(service.hasUnread()).toBe(false);
			expect(service.highestPriority()).toBeNull();
		});
	});

	describe('dismiss / restore', () => {
		it('dismiss moves an active notification to dismissed history', () => {
			apiMock.getActivas.mockReturnValue(of([activa({ id: 1, prioridad: 'high' })]));
			service.checkNotifications();

			service.dismiss('api-1');

			expect(service.activeNotifications()).toHaveLength(0);
			expect(service.dismissedNotifications().map((n) => n.id)).toEqual(['api-1']);
			expect(service.unreadCount()).toBe(0);
			expect(storageMock.setDismissedNotificationsAsync).toHaveBeenCalled();
		});

		it('dismiss ignores non-dismissible notifications', () => {
			apiMock.getActivas.mockReturnValue(of([activa({ id: 1, dismissible: false })]));
			service.checkNotifications();

			service.dismiss('api-1');

			expect(service.activeNotifications()).toHaveLength(1);
			expect(service.dismissedNotifications()).toHaveLength(0);
		});

		it('restore un-dismisses and re-checks the API', () => {
			apiMock.getActivas.mockReturnValue(of([activa({ id: 1, prioridad: 'high' })]));
			service.checkNotifications();
			service.dismiss('api-1');
			expect(service.activeNotifications()).toHaveLength(0);

			service.restore('api-1');

			expect(service.dismissedNotifications()).toHaveLength(0);
			expect(service.activeNotifications().map((n) => n.id)).toEqual(['api-1']);
			expect(apiMock.getActivas).toHaveBeenCalledTimes(2);
		});
	});

	describe('read state + derived computeds', () => {
		it('markAsUnread reverts markAsRead and getByType filters actives', () => {
			apiMock.getActivas.mockReturnValue(
				of([
					activa({ id: 1, tipo: 'evento', prioridad: 'medium' }),
					activa({ id: 2, tipo: 'pago', prioridad: 'low' }),
				]),
			);
			service.checkNotifications();

			service.markAsRead('api-1');
			expect(service.isRead('api-1')).toBe(true);
			expect(service.unreadCount()).toBe(1);
			expect(service.highestPriority()).toBe('low');

			service.markAsUnread('api-1');
			expect(service.isRead('api-1')).toBe(false);
			expect(service.unreadCount()).toBe(2);

			expect(service.getByType('evento').map((n) => n.id)).toEqual(['api-1']);
			expect(service.getByType('pago').map((n) => n.id)).toEqual(['api-2']);
		});
	});

	describe('service worker messages', () => {
		it('PUSH_RECEIVED re-checks and NOTIFICATION_CLICKED marks the payload id read', async () => {
			const handlers = new Map<string, (e: MessageEvent) => void>();
			const swStub = {
				addEventListener: vi.fn((type: string, h: (e: MessageEvent) => void) => {
					handlers.set(type, h);
				}),
				removeEventListener: vi.fn(),
			};
			Object.defineProperty(globalThis.navigator, 'serviceWorker', {
				value: swStub,
				configurable: true,
			});
			const prevFlag = environment.features.notifications;
			environment.features.notifications = true;
			try {
				TestBed.resetTestingModule();
				TestBed.configureTestingModule({
					providers: [
						NotificationsService,
						{ provide: StorageService, useValue: storageMock },
						{ provide: NotificationsApiService, useValue: apiMock },
						{ provide: NotificationsSoundService, useValue: soundMock },
						{ provide: SmartNotificationService, useValue: smartMock },
						{ provide: PLATFORM_ID, useValue: 'browser' },
					],
				});
				const swService = TestBed.inject(NotificationsService);
				// Let the constructor's async initialize() settle.
				await Promise.resolve();
				await Promise.resolve();

				expect(swStub.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
				const handler = handlers.get('message');
				expect(handler).toBeDefined();

				apiMock.getActivas.mockClear();
				handler?.({ data: { type: 'PUSH_RECEIVED' } } as MessageEvent);
				expect(soundMock.playSound).toHaveBeenCalled();
				expect(apiMock.getActivas).toHaveBeenCalled();

				apiMock.getActivas.mockReturnValue(of([activa({ id: 7, prioridad: 'high' })]));
				swService.checkNotifications();
				handler?.({ data: { type: 'NOTIFICATION_CLICKED', payload: { id: 'api-7' } } } as MessageEvent);
				expect(swService.isRead('api-7')).toBe(true);

				swService.cleanup();
				expect(swStub.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
			} finally {
				environment.features.notifications = prevFlag;
				delete (globalThis.navigator as unknown as Record<string, unknown>)['serviceWorker'];
			}
		});
	});
});
// #endregion
