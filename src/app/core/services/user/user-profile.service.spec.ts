// * Tests for UserProfileService — validates user identity derivations.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';

import { UserProfileService } from './user-profile.service';
import { AuthService } from '../auth';
import { AuthUser } from '../auth/auth.models';

// #endregion

// #region Mocks
const mockUser: AuthUser = {
	rol: 'Profesor',
	nombreCompleto: 'Juan Carlos Pérez García',
	entityId: 42,
	sedeId: 1,
	dni: '12345678',
};

function createMockAuthService(user: AuthUser | null = null) {
	return {
		isAuthenticated$: new BehaviorSubject(!!user),
		currentUser$: new BehaviorSubject(user),
		currentUser: user,
	};
}
// #endregion

// #region Tests
describe('UserProfileService', () => {
	let service: UserProfileService;

	// #region Without user
	describe('without authenticated user', () => {
		beforeEach(() => {
			TestBed.configureTestingModule({
				providers: [
					UserProfileService,
					{ provide: AuthService, useValue: createMockAuthService() },
				],
			});
			service = TestBed.inject(UserProfileService);
		});

		it('should have empty profile', () => {
			expect(service.userRole()).toBe('');
			expect(service.userName()).toBe('');
			expect(service.entityId()).toBeNull();
			expect(service.sedeId()).toBeNull();
			expect(service.dni()).toBeNull();
		});

		it('should have empty display name and initials', () => {
			expect(service.displayName()).toBe('');
			expect(service.initials()).toBe('');
		});

		it('should not detect any role', () => {
			expect(service.isEstudiante()).toBe(false);
			expect(service.isProfesor()).toBe(false);
			expect(service.isDirector()).toBe(false);
		});
	});
	// #endregion

	// #region With user
	describe('with authenticated user', () => {
		beforeEach(() => {
			TestBed.configureTestingModule({
				providers: [
					UserProfileService,
					{ provide: AuthService, useValue: createMockAuthService(mockUser) },
				],
			});
			service = TestBed.inject(UserProfileService);
		});

		it('should have user data', () => {
			expect(service.userRole()).toBe('Profesor');
			expect(service.userName()).toBe('Juan Carlos Pérez García');
			expect(service.entityId()).toBe(42);
			expect(service.sedeId()).toBe(1);
			expect(service.dni()).toBe('12345678');
		});

		it('should detect profesor role', () => {
			expect(service.isProfesor()).toBe(true);
			expect(service.isEstudiante()).toBe(false);
			expect(service.isDirector()).toBe(false);
		});

		it('should compute display name (full name)', () => {
			expect(service.displayName()).toBe('Juan Carlos Pérez García');
		});

		it('should compute initials', () => {
			expect(service.initials()).toBe('JG');
		});
	});
	// #endregion

	// #region Display name edge cases
	describe('displayName edge cases', () => {
		it('should handle single name', () => {
			TestBed.configureTestingModule({
				providers: [
					UserProfileService,
					{ provide: AuthService, useValue: createMockAuthService({ ...mockUser, nombreCompleto: 'Admin' }) },
				],
			});
			service = TestBed.inject(UserProfileService);

			expect(service.displayName()).toBe('Admin');
			expect(service.initials()).toBe('A');
		});

		it('should handle two-part name', () => {
			TestBed.configureTestingModule({
				providers: [
					UserProfileService,
					{ provide: AuthService, useValue: createMockAuthService({ ...mockUser, nombreCompleto: 'Ana López' }) },
				],
			});
			service = TestBed.inject(UserProfileService);

			expect(service.displayName()).toBe('Ana López');
			expect(service.initials()).toBe('AL');
		});
	});
	// #endregion

	// #region Role detection
	describe('role detection', () => {
		const roles = [
			{ rol: 'Estudiante', check: 'isEstudiante' },
			{ rol: 'Apoderado', check: 'isApoderado' },
			{ rol: 'Profesor', check: 'isProfesor' },
			{ rol: 'Director', check: 'isDirector' },
			{ rol: 'Asistente Administrativo', check: 'isAsistenteAdministrativo' },
		] as const;

		for (const { rol, check } of roles) {
			it(`should detect ${rol} role`, () => {
				TestBed.resetTestingModule();
				TestBed.configureTestingModule({
					providers: [
						UserProfileService,
						{ provide: AuthService, useValue: createMockAuthService({ ...mockUser, rol: rol as never }) },
					],
				});
				const s = TestBed.inject(UserProfileService);
				expect(s[check]()).toBe(true);
			});
		}
	});
	// #endregion
});
// #endregion
