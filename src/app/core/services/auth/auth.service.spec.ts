import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { StorageService } from '../storage';
import { AuthUser, LoginResponse, UserRole } from './auth.models';

describe('AuthService', () => {
	let service: AuthService;
	let httpMock: HttpTestingController;
	let storageMock: Partial<StorageService>;

	const mockUser: AuthUser = {
		token: 'test-token',
		rol: 'Estudiante',
		nombreCompleto: 'Test User',
		entityId: 1,
		sedeId: 1,
	};

	const mockLoginResponse: LoginResponse = {
		token: 'test-token',
		rol: 'Estudiante',
		nombreCompleto: 'Test User',
		entityId: 1,
		sedeId: 1,
		mensaje: 'Login exitoso',
	};

	beforeEach(() => {
		storageMock = {
			hasToken: vi.fn().mockReturnValue(false),
			getUser: vi.fn().mockReturnValue(null),
			getToken: vi.fn().mockReturnValue(null),
			setToken: vi.fn(),
			setUser: vi.fn(),
			clearAuth: vi.fn(),
			getRememberToken: vi.fn().mockReturnValue(null),
			clearRememberToken: vi.fn(),
			getAllPersistentTokens: vi.fn().mockReturnValue([]),
		};

		TestBed.configureTestingModule({
			providers: [
				AuthService,
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: StorageService, useValue: storageMock },
			],
		});

		service = TestBed.inject(AuthService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	describe('isAuthenticated', () => {
		it('should return false when no token exists', () => {
			expect(service.isAuthenticated).toBe(false);
		});
	});

	describe('currentUser', () => {
		it('should return null when no user is stored', () => {
			expect(service.currentUser).toBeNull();
		});
	});

	describe('login', () => {
		it('should login successfully with valid credentials', () => {
			const dni = '12345678';
			const password = 'password';
			const rol: UserRole = 'Estudiante';

			service.login(dni, password, rol).subscribe((response) => {
				expect(response.token).toBe('test-token');
				expect(storageMock.setToken).toHaveBeenCalled();
				expect(storageMock.setUser).toHaveBeenCalled();
			});

			const req = httpMock.expectOne((r) => r.url.includes('/api/Auth/login'));
			expect(req.request.method).toBe('POST');
			req.flush(mockLoginResponse);
		});

		it('should handle login failure', () => {
			const dni = '12345678';
			const password = 'wrong-password';
			const rol: UserRole = 'Estudiante';

			service.login(dni, password, rol).subscribe((response) => {
				expect(response.token).toBe('');
			});

			const req = httpMock.expectOne((r) => r.url.includes('/api/Auth/login'));
			req.flush({ mensaje: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
		});

		it('should block after max login attempts', () => {
			// Simular 3 intentos fallidos
			for (let i = 0; i < 3; i++) {
				service.login('12345678', 'wrong', 'Estudiante').subscribe();
				const req = httpMock.expectOne((r) => r.url.includes('/api/Auth/login'));
				req.flush({ token: '', mensaje: 'Error' });
			}

			expect(service.isBlocked).toBe(true);

			// El siguiente intento debería ser bloqueado sin hacer request
			service.login('12345678', 'password', 'Estudiante').subscribe((response) => {
				expect(response.mensaje).toContain('Demasiados intentos');
			});

			httpMock.expectNone((r) => r.url.includes('/api/Auth/login'));
		});
	});

	describe('logout', () => {
		it('should clear auth state on logout', () => {
			service.logout();

			expect(storageMock.clearAuth).toHaveBeenCalled();
			expect(service.isAuthenticated).toBe(false);
			expect(service.currentUser).toBeNull();
		});
	});

	describe('remainingAttempts', () => {
		it('should return correct remaining attempts', () => {
			expect(service.remainingAttempts).toBe(3);

			service.login('12345678', 'wrong', 'Estudiante').subscribe();
			const req = httpMock.expectOne((r) => r.url.includes('/api/Auth/login'));
			req.flush({ token: '', mensaje: 'Error' });

			expect(service.remainingAttempts).toBe(2);
		});
	});

	describe('resetAttempts', () => {
		it('should reset login attempts', () => {
			// Hacer un intento fallido
			service.login('12345678', 'wrong', 'Estudiante').subscribe();
			const req = httpMock.expectOne((r) => r.url.includes('/api/Auth/login'));
			req.flush({ token: '', mensaje: 'Error' });

			expect(service.loginAttempts).toBe(1);

			service.resetAttempts();

			expect(service.loginAttempts).toBe(0);
		});
	});

	describe('verifyToken', () => {
		it('should return false when no token exists', () => {
			service.verifyToken().subscribe((isValid) => {
				expect(isValid).toBe(false);
			});
		});
	});
});
