import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideZonelessChangeDetection, Component } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { AuthService } from '@core/services/auth/auth.service';
import { AuthApiService } from '@core/services/auth/auth-api.service';
import { StorageService } from '@core/services/storage';
import { LoginResponse, UserRole } from '@core/services/auth/auth.models';

@Component({ template: '', standalone: true })
class DummyComponent {}

const MOCK_LOGIN_RESPONSE: LoginResponse = {
	success: true,
	token: '',
	rol: 'Profesor' as UserRole,
	nombreCompleto: 'Juan Pérez',
	entityId: 42,
	sedeId: 1,
	mensaje: '',
};

describe('Login Flow Integration', () => {
	let authService: AuthService;
	let httpMock: HttpTestingController;
	let router: Router;
	let mockStorage: Record<string, ReturnType<typeof vi.fn>>;

	beforeEach(() => {
		mockStorage = {
			hasUserInfo: vi.fn().mockReturnValue(false),
			getUser: vi.fn().mockReturnValue(null),
			setUser: vi.fn(),
			clearAuth: vi.fn(),
			clearPermisos: vi.fn(),
			getPermisos: vi.fn().mockReturnValue(null),
			setPermisos: vi.fn(),
		};

		TestBed.configureTestingModule({
			providers: [
				provideZonelessChangeDetection(),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([
					{ path: 'intranet', component: DummyComponent },
					{ path: 'intranet/login', component: DummyComponent },
				]),
				{ provide: StorageService, useValue: mockStorage },
			],
		});

		authService = TestBed.inject(AuthService);
		httpMock = TestBed.inject(HttpTestingController);
		router = TestBed.inject(Router);
	});

	afterEach(() => {
		httpMock.match(() => true).forEach((r) => r.flush(null));
	});

	it('should authenticate, store user, and update state on successful login', () => {
		let response: LoginResponse | undefined;

		authService.login('12345678', 'pass', 'Profesor').subscribe((r) => {
			response = r;
		});

		const loginReq = httpMock.expectOne((r) => r.url.includes('/api/Auth/login'));
		loginReq.flush(MOCK_LOGIN_RESPONSE);

		// Warmup fire-and-forget
		const warmupReq = httpMock.match((r) => r.url.includes('/api/sistema/warmup'));
		warmupReq.forEach((r) => r.flush(null));

		expect(response?.success).toBe(true);
		expect(authService.isAuthenticated).toBe(true);
		expect(authService.currentUser?.nombreCompleto).toBe('Juan Pérez');
		expect(authService.currentUser?.rol).toBe('Profesor');
		expect(mockStorage.setUser).toHaveBeenCalled();
		expect(authService.loginAttempts).toBe(0);
	});

	it('should increment attempts on failed login', () => {
		authService.login('12345678', 'wrong', 'Profesor').subscribe();

		const req = httpMock.expectOne((r) => r.url.includes('/api/Auth/login'));
		req.flush({ ...MOCK_LOGIN_RESPONSE, success: false, mensaje: 'Credenciales inválidas' });

		expect(authService.isAuthenticated).toBe(false);
		expect(authService.loginAttempts).toBe(1);
		expect(authService.remainingAttempts).toBe(2);
	});

	it('should block login after 3 failed attempts', () => {
		for (let i = 0; i < 3; i++) {
			authService.login('12345678', 'wrong', 'Profesor').subscribe();
			const req = httpMock.expectOne((r) => r.url.includes('/api/Auth/login'));
			req.flush({ ...MOCK_LOGIN_RESPONSE, success: false });
		}

		expect(authService.isBlocked).toBe(true);

		let blockedResponse: LoginResponse | undefined;
		authService.login('12345678', 'pass', 'Profesor').subscribe((r) => {
			blockedResponse = r;
		});

		httpMock.expectNone((r) => r.url.includes('/api/Auth/login'));
		expect(blockedResponse?.success).toBe(false);
	});

	it('should handle HTTP error gracefully and increment attempts', () => {
		let response: LoginResponse | undefined;

		authService.login('12345678', 'pass', 'Profesor').subscribe((r) => {
			response = r;
		});

		const req = httpMock.expectOne((r) => r.url.includes('/api/Auth/login'));
		req.flush({ mensaje: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });

		expect(response?.success).toBe(false);
		expect(authService.loginAttempts).toBe(1);
	});

	it('should clear state and storage on logout', () => {
		// First login
		authService.login('12345678', 'pass', 'Profesor').subscribe();
		const loginReq = httpMock.expectOne((r) => r.url.includes('/api/Auth/login'));
		loginReq.flush(MOCK_LOGIN_RESPONSE);

		const warmupReqs = httpMock.match((r) => r.url.includes('/api/sistema/warmup'));
		warmupReqs.forEach((r) => r.flush(null));

		expect(authService.isAuthenticated).toBe(true);

		// Logout
		authService.logout();

		const logoutReq = httpMock.match((r) => r.url.includes('/api/Auth/logout'));
		logoutReq.forEach((r) => r.flush(null));

		expect(authService.isAuthenticated).toBe(false);
		expect(authService.currentUser).toBeNull();
		expect(mockStorage.clearAuth).toHaveBeenCalled();
		expect(mockStorage.clearPermisos).toHaveBeenCalled();
	});

	it('should reset attempts after successful login', () => {
		// Fail twice
		for (let i = 0; i < 2; i++) {
			authService.login('12345678', 'wrong', 'Profesor').subscribe();
			const req = httpMock.expectOne((r) => r.url.includes('/api/Auth/login'));
			req.flush({ ...MOCK_LOGIN_RESPONSE, success: false });
		}
		expect(authService.loginAttempts).toBe(2);

		// Succeed
		authService.login('12345678', 'pass', 'Profesor').subscribe();
		const req = httpMock.expectOne((r) => r.url.includes('/api/Auth/login'));
		req.flush(MOCK_LOGIN_RESPONSE);

		const warmupReqs = httpMock.match((r) => r.url.includes('/api/sistema/warmup'));
		warmupReqs.forEach((r) => r.flush(null));

		expect(authService.loginAttempts).toBe(0);
	});
});
