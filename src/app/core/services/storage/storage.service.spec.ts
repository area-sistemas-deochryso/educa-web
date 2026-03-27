// * Tests for StorageService delegation logic (post cookie migration).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageService } from './storage.service';
import { SessionStorageService } from './session-storage.service';
import { PreferencesStorageService } from './preferences-storage.service';
import { NotificationStorageService } from './notification-storage.service';
import { AuthUser } from './storage.models';

// #endregion

// #region Tests
describe('StorageService', () => {
	let service: StorageService;
	let sessionMock: Partial<SessionStorageService>;
	let preferencesMock: Partial<PreferencesStorageService>;
	let notificationStorageMock: Partial<NotificationStorageService>;

	const mockUser: AuthUser = {
		rol: 'Estudiante',
		nombreCompleto: 'Test User',
		entityId: 1,
		sedeId: 1,
	};

	beforeEach(() => {
		sessionMock = {
			getUser: vi.fn().mockReturnValue(mockUser),
			setUser: vi.fn(),
			removeUser: vi.fn(),
			clearAuth: vi.fn(),
			getPermisos: vi.fn().mockReturnValue(null),
			setPermisos: vi.fn(),
			clearPermisos: vi.fn(),
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

		notificationStorageMock = {
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
				{ provide: NotificationStorageService, useValue: notificationStorageMock },
			],
		});

		service = TestBed.inject(StorageService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	// #region Auth methods
	describe('Auth methods', () => {
		it('should delegate hasUserInfo to getUser', () => {
			expect(service.hasUserInfo()).toBe(true);
			sessionMock.getUser = vi.fn().mockReturnValue(null);
			expect(service.hasUserInfo()).toBe(false);
		});

		it('should delegate getUser to session service', () => {
			const user = service.getUser();
			expect(sessionMock.getUser).toHaveBeenCalled();
			expect(user).toEqual(mockUser);
		});

		it('should delegate setUser to session service', () => {
			service.setUser(mockUser, true);
			expect(sessionMock.setUser).toHaveBeenCalledWith(mockUser, true);
		});

		it('should delegate clearAuth to session service', () => {
			service.clearAuth();
			expect(sessionMock.clearAuth).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region Permisos methods
	describe('Permisos methods', () => {
		it('should delegate getPermisos to session service', () => {
			service.getPermisos();
			expect(sessionMock.getPermisos).toHaveBeenCalled();
		});

		it('should delegate setPermisos to session service', () => {
			const permisos = { usuarioId: 1, rol: 'Director' as const, vistasPermitidas: [], tienePermisosPersonalizados: false };
			service.setPermisos(permisos);
			expect(sessionMock.setPermisos).toHaveBeenCalledWith(permisos);
		});

		it('should delegate clearPermisos to session service', () => {
			service.clearPermisos();
			expect(sessionMock.clearPermisos).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region Attendance preferences
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
	// #endregion

	// #region clearAll
	describe('clearAll', () => {
		it('should clear all storage services', () => {
			service.clearAll();

			expect(sessionMock.clearAuth).toHaveBeenCalled();
			expect(sessionMock.clearPermisos).toHaveBeenCalled();
			expect(notificationStorageMock.clearNotifications).toHaveBeenCalled();
			expect(preferencesMock.clearAttendancePreferences).toHaveBeenCalled();
		});
	});
	// #endregion
});
// #endregion
