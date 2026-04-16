// * Tests for AuthService login/logout behavior (cookie-based auth).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { AuthApiService } from './auth-api.service';
import { StorageService } from '../storage';
import { AuthUser, LoginResponse, StoredSession } from './auth.models';

// #endregion

// #region Mocks
const _mockUser: AuthUser = {
	rol: 'Estudiante',
	nombreCompleto: 'Test User',
	entityId: 1,
	sedeId: 1,
};

const mockLoginSuccess: LoginResponse = {
	success: true,
	token: '',
	rol: 'Estudiante',
	nombreCompleto: 'Test User',
	entityId: 1,
	sedeId: 1,
	mensaje: 'Login exitoso',
};

const mockLoginFailure: LoginResponse = {
	success: false,
	token: '',
	rol: 'Estudiante',
	nombreCompleto: '',
	entityId: 0,
	sedeId: 0,
	mensaje: 'Credenciales inválidas',
};
// #endregion

// #region Tests
describe('AuthService', () => {
	let service: AuthService;
	let storageMock: Partial<StorageService>;
	let apiMock: Partial<AuthApiService>;

	beforeEach(() => {
		storageMock = {
			hasUserInfo: vi.fn().mockReturnValue(false),
			getUser: vi.fn().mockReturnValue(null),
			setUser: vi.fn(),
			clearAuth: vi.fn(),
			clearPermisos: vi.fn(),
		};

		apiMock = {
			login: vi.fn().mockReturnValue(of(mockLoginSuccess)),
			logout: vi.fn().mockReturnValue(of(undefined)),
			getProfile: vi.fn().mockReturnValue(of(null)),
			warmup: vi.fn().mockReturnValue(of(undefined)),
			getSessions: vi.fn().mockReturnValue(of([])),
		};

		TestBed.configureTestingModule({
			providers: [
				AuthService,
				{ provide: StorageService, useValue: storageMock },
				{ provide: AuthApiService, useValue: apiMock },
			],
		});

		service = TestBed.inject(AuthService);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	// #region Initial state
	describe('initial state', () => {
		it('should return false for isAuthenticated when no user info', () => {
			expect(service.isAuthenticated).toBe(false);
		});

		it('should return null for currentUser when no user stored', () => {
			expect(service.currentUser).toBeNull();
		});

		it('should start with 3 remaining attempts', () => {
			expect(service.remainingAttempts).toBe(3);
		});

		it('should not be blocked initially', () => {
			expect(service.isBlocked).toBe(false);
		});
	});
	// #endregion

	// #region Login
	describe('login', () => {
		it('should login successfully and store user', () => {
			service.login('12345678', 'password', 'Estudiante').subscribe((response) => {
				expect(response.success).toBe(true);
			});

			expect(storageMock.setUser).toHaveBeenCalled();
			expect(service.isAuthenticated).toBe(true);
			expect(service.currentUser?.nombreCompleto).toBe('Test User');
		});

		it('should increment attempts on failed login', () => {
			apiMock.login = vi.fn().mockReturnValue(of(mockLoginFailure));

			service.login('12345678', 'wrong', 'Estudiante').subscribe();

			expect(service.loginAttempts).toBe(1);
			expect(service.remainingAttempts).toBe(2);
		});

		it('should increment attempts on HTTP error', () => {
			apiMock.login = vi.fn().mockReturnValue(
				throwError(() => ({ error: { mensaje: 'Server error' } })),
			);

			service.login('12345678', 'wrong', 'Estudiante').subscribe((response) => {
				expect(response.success).toBe(false);
			});

			expect(service.loginAttempts).toBe(1);
		});

		it('should block after 3 failed attempts', () => {
			apiMock.login = vi.fn().mockReturnValue(of(mockLoginFailure));

			for (let i = 0; i < 3; i++) {
				service.login('12345678', 'wrong', 'Estudiante').subscribe();
			}

			expect(service.isBlocked).toBe(true);
		});

		it('should return blocked message without calling API when blocked', () => {
			apiMock.login = vi.fn().mockReturnValue(of(mockLoginFailure));

			for (let i = 0; i < 3; i++) {
				service.login('12345678', 'wrong', 'Estudiante').subscribe();
			}

			// Reset mock to track the next call
			vi.mocked(apiMock.login!).mockClear();

			service.login('12345678', 'password', 'Estudiante').subscribe((response) => {
				expect(response.success).toBe(false);
				expect(response.mensaje).toBeTruthy();
			});

			expect(apiMock.login).not.toHaveBeenCalled();
		});

		it('should reset attempts on successful login', () => {
			// Fail once
			apiMock.login = vi.fn().mockReturnValue(of(mockLoginFailure));
			service.login('12345678', 'wrong', 'Estudiante').subscribe();
			expect(service.loginAttempts).toBe(1);

			// Succeed
			apiMock.login = vi.fn().mockReturnValue(of(mockLoginSuccess));
			service.login('12345678', 'correct', 'Estudiante').subscribe();
			expect(service.loginAttempts).toBe(0);
		});
	});
	// #endregion

	// #region Logout
	describe('logout', () => {
		it('should clear auth state on logout', () => {
			// Login first
			service.login('12345678', 'password', 'Estudiante').subscribe();

			service.logout();

			expect(storageMock.clearAuth).toHaveBeenCalled();
			expect(storageMock.clearPermisos).toHaveBeenCalled();
			expect(service.isAuthenticated).toBe(false);
			expect(service.currentUser).toBeNull();
		});

		it('should reset attempts on logout', () => {
			apiMock.login = vi.fn().mockReturnValue(of(mockLoginFailure));
			service.login('12345678', 'wrong', 'Estudiante').subscribe();
			expect(service.loginAttempts).toBe(1);

			service.logout();
			expect(service.loginAttempts).toBe(0);
		});
	});
	// #endregion

	// #region Reset attempts
	describe('resetAttempts', () => {
		it('should reset login attempts to zero', () => {
			apiMock.login = vi.fn().mockReturnValue(of(mockLoginFailure));
			service.login('12345678', 'wrong', 'Estudiante').subscribe();
			expect(service.loginAttempts).toBe(1);

			service.resetAttempts();
			expect(service.loginAttempts).toBe(0);
		});
	});
	// #endregion

	// #region verifyToken
	describe('verifyToken', () => {
		it('should return false when profile is null', () => {
			apiMock.getProfile = vi.fn().mockReturnValue(of(null));

			service.verifyToken().subscribe((isValid) => {
				expect(isValid).toBe(false);
			});
		});

		it('should return true when profile exists', () => {
			apiMock.getProfile = vi.fn().mockReturnValue(
				of({ dni: '12345678', rol: 'Estudiante', nombreCompleto: 'Test', entityId: '1', sedeId: '1' }),
			);

			service.verifyToken().subscribe((isValid) => {
				expect(isValid).toBe(true);
			});
		});
	});
	// #endregion

	// #region cambiarContrasena
	describe('cambiarContrasena', () => {
		it('should delegate to API and return message', () => {
			const dto = { contrasenaActual: 'old', nuevaContrasena: 'new' };
			apiMock.cambiarContrasena = vi.fn().mockReturnValue(of({ mensaje: 'Contraseña actualizada' }));

			service.cambiarContrasena(dto).subscribe((result) => {
				expect(result.mensaje).toBe('Contraseña actualizada');
			});

			expect(apiMock.cambiarContrasena).toHaveBeenCalledWith(dto);
		});
	});
	// #endregion

	// #region Sessions (Multi-User)
	describe('sessions', () => {
		const mockSession: StoredSession = {
			sessionId: 'sess-1',
			nombreCompleto: 'Director Test',
			rol: 'Director',
			entityId: 10,
			sedeId: 1,
		};

		it('should fetch sessions from API', () => {
			apiMock.getSessions = vi.fn().mockReturnValue(of([mockSession]));

			service.getSessions().subscribe((sessions) => {
				expect(sessions).toHaveLength(1);
				expect(sessions[0].nombreCompleto).toBe('Director Test');
			});
		});

		it('should update auth state on switchSession', () => {
			apiMock.switchSession = vi.fn().mockReturnValue(of(mockSession));

			service.switchSession('sess-1').subscribe();

			expect(service.isAuthenticated).toBe(true);
			expect(service.currentUser?.rol).toBe('Director');
			expect(service.currentUser?.entityId).toBe(10);
			expect(storageMock.setUser).toHaveBeenCalled();
		});

		it('should delegate removeSession to API', () => {
			apiMock.deleteSession = vi.fn().mockReturnValue(of(undefined));

			service.removeSession('sess-1').subscribe();

			expect(apiMock.deleteSession).toHaveBeenCalledWith('sess-1');
		});
	});
	// #endregion
});
// #endregion
