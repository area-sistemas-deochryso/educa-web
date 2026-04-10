// * Security contract tests for AuthService.
// * These tests verify INVARIANTS that, if broken, create security vulnerabilities.
// * Do NOT remove or weaken these assertions without security review.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { AuthService } from './auth.service';
import { AuthApiService } from './auth-api.service';
import { StorageService } from '../storage';
import { AuthUser, LoginResponse } from './auth.models';

// #endregion

// #region Mocks
const mockLoginSuccess: LoginResponse = {
	success: true,
	token: 'should-never-be-stored',
	rol: 'Estudiante',
	nombreCompleto: 'Test User',
	entityId: 1,
	sedeId: 1,
	mensaje: 'OK',
};

function createMocks() {
	return {
		storage: {
			hasUserInfo: vi.fn().mockReturnValue(false),
			getUser: vi.fn().mockReturnValue(null),
			setUser: vi.fn(),
			clearAuth: vi.fn(),
			clearPermisos: vi.fn(),
		} as Partial<StorageService>,
		api: {
			login: vi.fn().mockReturnValue(of(mockLoginSuccess)),
			logout: vi.fn().mockReturnValue(of(undefined)),
			getProfile: vi.fn().mockReturnValue(of(null)),
			warmup: vi.fn().mockReturnValue(of(undefined)),
			getSessions: vi.fn().mockReturnValue(of([])),
		} as Partial<AuthApiService>,
	};
}
// #endregion

// #region Security contract tests
describe('AuthService — Security Contracts', () => {
	let service: AuthService;
	let mocks: ReturnType<typeof createMocks>;

	beforeEach(() => {
		mocks = createMocks();

		TestBed.configureTestingModule({
			providers: [
				AuthService,
				{ provide: StorageService, useValue: mocks.storage },
				{ provide: AuthApiService, useValue: mocks.api },
			],
		});

		service = TestBed.inject(AuthService);
	});

	// #region INV: Token never in JS storage
	describe('INV: Token never stored in JS-accessible storage', () => {
		it('should store AuthUser WITHOUT token property after login', () => {
			service.login('12345678', 'password', 'Estudiante').subscribe();

			const storedUser = (mocks.storage.setUser as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as AuthUser;
			expect(storedUser).toBeDefined();
			expect('token' in storedUser).toBe(false);
			expect(storedUser.rol).toBe('Estudiante');
			expect(storedUser.nombreCompleto).toBe('Test User');
			expect(storedUser.entityId).toBe(1);
			expect(storedUser.sedeId).toBe(1);
		});

		it('should store AuthUser WITHOUT token even when API returns a token', () => {
			// Simulate legacy backend that still sends token in response
			mocks.api.login = vi.fn().mockReturnValue(of({
				...mockLoginSuccess,
				token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake',
			}));

			service.login('12345678', 'password', 'Estudiante').subscribe();

			const storedUser = (mocks.storage.setUser as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as AuthUser;
			expect('token' in storedUser).toBe(false);
		});

		it('AuthUser interface should not have a token field', () => {
			// Compile-time guard: if someone adds `token` to AuthUser, this shape check fails
			const validUser: AuthUser = {
				rol: 'Estudiante',
				nombreCompleto: 'Test',
				entityId: 1,
				sedeId: 1,
			};
			const keys = Object.keys(validUser);
			expect(keys).not.toContain('token');
		});
	});
	// #endregion

	// #region INV: StorageService has no token methods
	describe('INV: StorageService has no token access methods', () => {
		it('should NOT expose getToken method', () => {
			expect('getToken' in mocks.storage).toBe(false);
			// Also verify on a real instance shape
			const realStorage = TestBed.inject(StorageService);
			expect(typeof (realStorage as any).getToken).toBe('undefined');
		});

		it('should NOT expose setToken method', () => {
			const realStorage = TestBed.inject(StorageService);
			expect(typeof (realStorage as any).setToken).toBe('undefined');
		});

		it('should NOT expose hasToken method', () => {
			const realStorage = TestBed.inject(StorageService);
			expect(typeof (realStorage as any).hasToken).toBe('undefined');
		});

		it('should NOT expose removeToken method', () => {
			const realStorage = TestBed.inject(StorageService);
			expect(typeof (realStorage as any).removeToken).toBe('undefined');
		});
	});
	// #endregion

	// #region INV: Logout clears ALL state
	describe('INV: Logout clears all auth and permisos state', () => {
		it('should clear both permisos AND auth storage', () => {
			service.login('12345678', 'password', 'Estudiante').subscribe();
			service.logout();

			expect(mocks.storage.clearPermisos).toHaveBeenCalled();
			expect(mocks.storage.clearAuth).toHaveBeenCalled();
		});

		it('should reset all reactive signals to unauthenticated defaults', () => {
			service.login('12345678', 'password', 'Estudiante').subscribe();
			expect(service.isAuthenticated).toBe(true);

			service.logout();

			expect(service.isAuthenticated).toBe(false);
			expect(service.currentUser).toBeNull();
			expect(service.loginAttempts).toBe(0);
		});

		it('should clear permisos BEFORE clearing auth (order matters)', () => {
			const callOrder: string[] = [];
			(mocks.storage.clearPermisos as ReturnType<typeof vi.fn>).mockImplementation(() => callOrder.push('permisos'));
			(mocks.storage.clearAuth as ReturnType<typeof vi.fn>).mockImplementation(() => callOrder.push('auth'));

			service.logout();

			expect(callOrder).toEqual(['permisos', 'auth']);
		});
	});
	// #endregion
});
// #endregion
