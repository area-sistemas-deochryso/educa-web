// * Tests for error interceptor — validates error routing, 401 refresh flow, and skip logic.
// #region Imports
import { TestBed } from '@angular/core/testing';
import {
	HttpClient,
	HttpErrorResponse,
	provideHttpClient,
	withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { errorInterceptor } from './error.interceptor';
import { ErrorHandlerService } from '@core/services/error';
import { ErrorReporterService } from '@core/services/error/error-reporter.service';
import { AuthApiService } from '@core/services/auth/auth-api.service';
import { SessionActivityService } from '@core/services/session';

// #endregion

// #region Tests
describe('errorInterceptor', () => {
	let httpClient: HttpClient;
	let httpMock: HttpTestingController;
	let errorHandlerMock: Partial<ErrorHandlerService>;
	let errorReporterMock: Partial<ErrorReporterService>;
	let authApiMock: Partial<AuthApiService>;
	let sessionActivityMock: Partial<SessionActivityService>;

	beforeEach(() => {
		errorHandlerMock = { handleHttpError: vi.fn() };
		errorReporterMock = { reportHttpError: vi.fn() };
		authApiMock = { refresh: vi.fn().mockReturnValue(of({ rol: 'Director', nombreCompleto: 'Test', entityId: 1, sedeId: 1 })) };
		sessionActivityMock = { forceLogout: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([errorInterceptor])),
				provideHttpClientTesting(),
				{ provide: ErrorHandlerService, useValue: errorHandlerMock },
				{ provide: ErrorReporterService, useValue: errorReporterMock },
				{ provide: AuthApiService, useValue: authApiMock },
				{ provide: SessionActivityService, useValue: sessionActivityMock },
			],
		});

		httpClient = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	// #region Pass-through
	describe('successful requests', () => {
		it('should pass through successful requests', () => {
			httpClient.get('/api/test').subscribe((response) => {
				expect(response).toEqual({ success: true });
			});

			httpMock.expectOne('/api/test').flush({ success: true });
			expect(errorHandlerMock.handleHttpError).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region General error handling
	describe('general error handling', () => {
		it('should call errorHandler for 500 errors', () => {
			httpClient.get('/api/users').subscribe({
				error: (error) => {
					expect(error).toBeInstanceOf(HttpErrorResponse);
					expect(error.status).toBe(500);
				},
			});

			httpMock.expectOne('/api/users').flush('Server Error', {
				status: 500,
				statusText: 'Internal Server Error',
			});

			expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(
				expect.any(HttpErrorResponse),
				expect.objectContaining({ url: '/api/users', method: 'GET' }),
			);
		});

		it('should pass request body metadata to errorHandler', () => {
			const body = { username: 'test' };
			httpClient.post('/api/data', body).subscribe({ error: () => {} });

			httpMock.expectOne('/api/data').flush('Error', { status: 400, statusText: 'Bad Request' });

			expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(
				expect.any(HttpErrorResponse),
				expect.objectContaining({ method: 'POST', body }),
			);
		});

		it('should extract errorCode from response body', () => {
			httpClient.get('/api/conflict').subscribe({ error: () => {} });

			httpMock.expectOne('/api/conflict').flush(
				{ errorCode: 'CONCURRENCY_CONFLICT', traceId: 'abc-123' },
				{ status: 409, statusText: 'Conflict' },
			);

			expect(errorHandlerMock.handleHttpError).toHaveBeenCalledWith(
				expect.any(HttpErrorResponse),
				expect.objectContaining({ errorCode: 'CONCURRENCY_CONFLICT', traceId: 'abc-123' }),
			);
		});
	});
	// #endregion

	// #region Skip URLs (login, verificar, logout, refresh)
	describe('skip URLs', () => {
		it('should NOT call errorHandler for /login endpoint', () => {
			httpClient.post('/api/Auth/login', {}).subscribe({ error: () => {} });

			httpMock.expectOne('/api/Auth/login').flush('Unauthorized', {
				status: 401,
				statusText: 'Unauthorized',
			});

			expect(errorHandlerMock.handleHttpError).not.toHaveBeenCalled();
		});

		it('should NOT call errorHandler for /verificar endpoint', () => {
			httpClient.post('/api/Auth/verificar', {}).subscribe({ error: () => {} });

			httpMock.expectOne('/api/Auth/verificar').flush('Unauthorized', {
				status: 401,
				statusText: 'Unauthorized',
			});

			expect(errorHandlerMock.handleHttpError).not.toHaveBeenCalled();
		});

		it('should NOT call errorHandler for /logout endpoint', () => {
			httpClient.post('/api/Auth/logout', {}).subscribe({ error: () => {} });

			httpMock.expectOne('/api/Auth/logout').flush('Error', {
				status: 500,
				statusText: 'Server Error',
			});

			expect(errorHandlerMock.handleHttpError).not.toHaveBeenCalled();
		});

		it('should NOT call errorHandler for /refresh endpoint', () => {
			httpClient.post('/api/Auth/refresh', {}).subscribe({ error: () => {} });

			httpMock.expectOne('/api/Auth/refresh').flush('Error', {
				status: 500,
				statusText: 'Server Error',
			});

			expect(errorHandlerMock.handleHttpError).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region 429 suppression
	describe('429 Too Many Requests', () => {
		it('should suppress errorHandler toast for 429', () => {
			httpClient.get('/api/heavy').subscribe({
				error: (err) => {
					expect(err.status).toBe(429);
				},
			});

			httpMock.expectOne('/api/heavy').flush(null, {
				status: 429,
				statusText: 'Too Many Requests',
			});

			expect(errorHandlerMock.handleHttpError).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region X-Skip-Error-Toast
	describe('X-Skip-Error-Toast header', () => {
		it('should skip errorHandler when request has X-Skip-Error-Toast', () => {
			httpClient
				.get('/api/silent', { headers: { 'X-Skip-Error-Toast': 'true' } })
				.subscribe({ error: () => {} });

			httpMock.expectOne('/api/silent').flush('Error', {
				status: 500,
				statusText: 'Server Error',
			});

			expect(errorHandlerMock.handleHttpError).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region 401 refresh flow
	describe('401 refresh flow', () => {
		it('should retry request after successful token refresh', () => {
			let responseData: unknown;
			httpClient.get('/api/protected').subscribe({
				next: (data) => { responseData = data; },
				error: () => {},
			});

			// First request returns 401
			httpMock.expectOne('/api/protected').flush('Unauthorized', {
				status: 401,
				statusText: 'Unauthorized',
			});

			// Interceptor retries the original request after refresh succeeds
			const retryReq = httpMock.expectOne('/api/protected');
			retryReq.flush({ data: 'recovered' });

			expect(responseData).toEqual({ data: 'recovered' });
			expect(sessionActivityMock.forceLogout).not.toHaveBeenCalled();
		});

		it('should force logout when refresh fails', () => {
			authApiMock.refresh = vi.fn().mockReturnValue(
				throwError(() => new HttpErrorResponse({ status: 401 })),
			);

			httpClient.get('/api/protected').subscribe({ error: () => {} });

			httpMock.expectOne('/api/protected').flush('Unauthorized', {
				status: 401,
				statusText: 'Unauthorized',
			});

			expect(sessionActivityMock.forceLogout).toHaveBeenCalled();
		});

		it('should NOT attempt refresh for skip URLs', () => {
			httpClient.post('/api/Auth/login', {}).subscribe({ error: () => {} });

			httpMock.expectOne('/api/Auth/login').flush('Unauthorized', {
				status: 401,
				statusText: 'Unauthorized',
			});

			expect(authApiMock.refresh).not.toHaveBeenCalled();
			expect(sessionActivityMock.forceLogout).not.toHaveBeenCalled();
		});
	});
	// #endregion
});
// #endregion
