// * Security contract tests for StorageService.
// * These tests verify that the storage facade NEVER exposes token methods
// * and that cleanup operations are thorough.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageService } from './storage.service';
import { SessionStorageService } from './session-storage.service';
import { PreferencesStorageService } from './preferences-storage.service';
import { NotificationStorageService } from './notification-storage.service';

// #endregion

// #region Mocks
function createMocks() {
	return {
		session: {
			getUser: vi.fn().mockReturnValue(null),
			setUser: vi.fn(),
			removeUser: vi.fn(),
			clearAuth: vi.fn(),
			getPermisos: vi.fn().mockReturnValue(null),
			setPermisos: vi.fn(),
			clearPermisos: vi.fn(),
			clearAll: vi.fn(),
		} as Partial<SessionStorageService>,
		preferences: {
			clearAll: vi.fn(),
			clearAttendancePreferences: vi.fn(),
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
			getSelectedGradoSeccionDirector: vi.fn().mockReturnValue(null),
			setSelectedGradoSeccionDirector: vi.fn(),
			clearSelectedGradoSeccionDirector: vi.fn(),
			getSelectedEstudianteDirectorId: vi.fn().mockReturnValue(null),
			setSelectedEstudianteDirectorId: vi.fn(),
			clearSelectedEstudianteDirectorId: vi.fn(),
		} as Partial<PreferencesStorageService>,
		notificationStorage: {
			clearAll: vi.fn(),
		} as Partial<NotificationStorageService>,
	};
}
// #endregion

// #region Security contract tests
describe('StorageService — Security Contracts', () => {
	let service: StorageService;
	let mocks: ReturnType<typeof createMocks>;

	beforeEach(() => {
		mocks = createMocks();

		TestBed.configureTestingModule({
			providers: [
				StorageService,
				{ provide: SessionStorageService, useValue: mocks.session },
				{ provide: PreferencesStorageService, useValue: mocks.preferences },
				{ provide: NotificationStorageService, useValue: mocks.notificationStorage },
			],
		});

		service = TestBed.inject(StorageService);
	});

	// #region INV: No token methods on StorageService
	describe('INV: StorageService must NOT expose token access methods', () => {
		it('should NOT have getToken method', () => {
			expect(typeof (service as unknown as Record<string, unknown>).getToken).toBe('undefined');
		});

		it('should NOT have setToken method', () => {
			expect(typeof (service as unknown as Record<string, unknown>).setToken).toBe('undefined');
		});

		it('should NOT have hasToken method', () => {
			expect(typeof (service as unknown as Record<string, unknown>).hasToken).toBe('undefined');
		});

		it('should NOT have removeToken method', () => {
			expect(typeof (service as unknown as Record<string, unknown>).removeToken).toBe('undefined');
		});
	});
	// #endregion

	// #region INV: clearAuth delegates completely
	describe('INV: clearAuth clears session auth state', () => {
		it('should delegate to SessionStorageService.clearAuth()', () => {
			service.clearAuth();

			expect(mocks.session.clearAuth).toHaveBeenCalledTimes(1);
		});
	});
	// #endregion

	// #region INV: clearPermisos delegates completely
	describe('INV: clearPermisos clears permission state', () => {
		it('should delegate to SessionStorageService.clearPermisos()', () => {
			service.clearPermisos();

			expect(mocks.session.clearPermisos).toHaveBeenCalledTimes(1);
		});
	});
	// #endregion

	// #region INV: setUser stores only AuthUser shape
	describe('INV: setUser stores only AuthUser (no sensitive data)', () => {
		it('should delegate user storage to SessionStorageService', () => {
			const user = { rol: 'Estudiante' as const, nombreCompleto: 'Test', entityId: 1, sedeId: 1 };

			service.setUser(user, false);

			expect(mocks.session.setUser).toHaveBeenCalledWith(user, false);
		});
	});
	// #endregion
});
// #endregion
