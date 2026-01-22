import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageService } from './storage.service';
import { SessionStorageService } from './session-storage.service';
import { PreferencesStorageService } from './preferences-storage.service';
import { IndexedDBService } from './indexed-db.service';
import { AuthUser } from './storage.models';

describe('StorageService', () => {
	let service: StorageService;
	let sessionMock: Partial<SessionStorageService>;
	let preferencesMock: Partial<PreferencesStorageService>;
	let idbMock: Partial<IndexedDBService>;

	const mockUser: AuthUser = {
		token: 'test-token',
		rol: 'Estudiante',
		nombreCompleto: 'Test User',
		entityId: 1,
		sedeId: 1,
	};

	beforeEach(() => {
		sessionMock = {
			getToken: vi.fn().mockReturnValue('test-token'),
			setToken: vi.fn(),
			removeToken: vi.fn(),
			hasToken: vi.fn().mockReturnValue(true),
			getUser: vi.fn().mockReturnValue(mockUser),
			setUser: vi.fn(),
			removeUser: vi.fn(),
			clearAuth: vi.fn(),
			getRememberToken: vi.fn().mockReturnValue(null),
			clearRememberToken: vi.fn(),
			getAllPersistentTokens: vi.fn().mockReturnValue([]),
			getLastNotificationCheck: vi.fn().mockReturnValue(null),
			setLastNotificationCheck: vi.fn(),
			getScheduleModalsState: vi.fn().mockReturnValue({}),
			setScheduleModalsState: vi.fn(),
			updateScheduleModalState: vi.fn(),
			clearScheduleModalsState: vi.fn(),
		};

		preferencesMock = {
			getAttendanceMonth: vi.fn().mockReturnValue(null),
			setAttendanceMonth: vi.fn(),
			clearAttendanceMonth: vi.fn(),
			getSelectedHijoId: vi.fn().mockReturnValue(null),
			setSelectedHijoId: vi.fn(),
			clearSelectedHijoId: vi.fn(),
			getSelectedSalonId: vi.fn().mockReturnValue(null),
			setSelectedSalonId: vi.fn(),
			clearSelectedSalonId: vi.fn(),
			getSelectedEstudianteId: vi.fn().mockReturnValue(null),
			setSelectedEstudianteId: vi.fn(),
			clearSelectedEstudianteId: vi.fn(),
			clearAttendancePreferences: vi.fn(),
		};

		idbMock = {
			getDismissedNotifications: vi.fn().mockResolvedValue(null),
			setDismissedNotifications: vi.fn().mockResolvedValue(undefined),
			removeDismissedNotifications: vi.fn(),
			getReadNotifications: vi.fn().mockResolvedValue(null),
			setReadNotifications: vi.fn().mockResolvedValue(undefined),
			removeReadNotifications: vi.fn(),
			clearNotifications: vi.fn(),
		};

		TestBed.configureTestingModule({
			providers: [
				StorageService,
				{ provide: SessionStorageService, useValue: sessionMock },
				{ provide: PreferencesStorageService, useValue: preferencesMock },
				{ provide: IndexedDBService, useValue: idbMock },
			],
		});

		service = TestBed.inject(StorageService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('Auth methods', () => {
		it('should delegate getToken to session service', () => {
			const token = service.getToken();
			expect(sessionMock.getToken).toHaveBeenCalled();
			expect(token).toBe('test-token');
		});

		it('should delegate setToken to session service', () => {
			service.setToken('new-token', true, 'User', 'Estudiante');
			expect(sessionMock.setToken).toHaveBeenCalledWith('new-token', true, 'User', 'Estudiante');
		});

		it('should delegate hasToken to session service', () => {
			const hasToken = service.hasToken();
			expect(sessionMock.hasToken).toHaveBeenCalled();
			expect(hasToken).toBe(true);
		});

		it('should delegate getUser to session service', () => {
			const user = service.getUser();
			expect(sessionMock.getUser).toHaveBeenCalled();
			expect(user).toEqual(mockUser);
		});

		it('should delegate clearAuth to session service', () => {
			service.clearAuth();
			expect(sessionMock.clearAuth).toHaveBeenCalled();
		});
	});

	describe('Attendance preferences', () => {
		it('should delegate getSelectedHijoId to preferences service', () => {
			service.getSelectedHijoId();
			expect(preferencesMock.getSelectedHijoId).toHaveBeenCalled();
		});

		it('should delegate setSelectedHijoId to preferences service', () => {
			service.setSelectedHijoId(123);
			expect(preferencesMock.setSelectedHijoId).toHaveBeenCalledWith(123);
		});

		it('should delegate getSelectedSalonId to preferences service', () => {
			service.getSelectedSalonId();
			expect(preferencesMock.getSelectedSalonId).toHaveBeenCalled();
		});

		it('should delegate setSelectedSalonId to preferences service', () => {
			service.setSelectedSalonId(456);
			expect(preferencesMock.setSelectedSalonId).toHaveBeenCalledWith(456);
		});
	});

	describe('clearAll', () => {
		it('should clear all storage', () => {
			service.clearAll();

			expect(sessionMock.clearAuth).toHaveBeenCalled();
			expect(idbMock.clearNotifications).toHaveBeenCalled();
			expect(sessionMock.clearScheduleModalsState).toHaveBeenCalled();
			expect(preferencesMock.clearAttendancePreferences).toHaveBeenCalled();
		});
	});
});
