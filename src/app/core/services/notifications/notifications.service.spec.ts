// * Tests for NotificationsService state changes.
import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationsService } from './notifications.service';
import { StorageService } from '@app/core/services/storage';

// Mock Audio
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

	beforeEach(() => {
		storageMock = {
			getDismissedNotifications: vi.fn().mockReturnValue(null),
			setDismissedNotifications: vi.fn(),
			removeDismissedNotifications: vi.fn(),
			getReadNotifications: vi.fn().mockReturnValue(null),
			setReadNotifications: vi.fn(),
			removeReadNotifications: vi.fn(),
			getLastNotificationCheck: vi.fn().mockReturnValue(null),
			setLastNotificationCheck: vi.fn(),
		};

		TestBed.configureTestingModule({
			providers: [
				NotificationsService,
				{ provide: StorageService, useValue: storageMock },
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
});
