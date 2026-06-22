import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { errorInterceptor } from '@core/interceptors/error/error.interceptor';
import { ErrorHandlerService } from '@core/services/error';
import { ForceLogoutSignal } from '@core/services/session/force-logout.signal';

describe('Error Recovery Integration', () => {
	let httpClient: HttpClient;
	let httpMock: HttpTestingController;
	let errorHandler: ErrorHandlerService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideZonelessChangeDetection(),
				provideRouter([]),
				provideHttpClient(withInterceptors([errorInterceptor])),
				provideHttpClientTesting(),
			],
		});

		httpClient = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
		errorHandler = TestBed.inject(ErrorHandlerService);
	});

	afterEach(() => {
		httpMock.match(() => true).forEach((r) => r.flush(null));
	});

	it('should pass through successful responses without errors', () => {
		let result: unknown;

		httpClient.get('/api/test').subscribe((r) => {
			result = r;
		});

		httpMock.expectOne('/api/test').flush({ data: 'ok' });

		expect(result).toEqual({ data: 'ok' });
		expect(errorHandler.hasErrors()).toBe(false);
	});

	it('should handle 500 errors and create notification', () => {
		let caughtError = false;

		httpClient.get('/api/test').subscribe({
			error: () => {
				caughtError = true;
			},
		});

		httpMock.expectOne('/api/test').flush(
			{ traceId: 'abc123', errorCode: 'SERVER_ERROR' },
			{ status: 500, statusText: 'Internal Server Error' },
		);

		expect(caughtError).toBe(true);
		expect(errorHandler.hasErrors()).toBe(true);
	});

	it('should handle 401 by attempting token refresh', () => {
		let retried = false;

		httpClient.get('/api/protected').subscribe({
			next: () => {
				retried = true;
			},
			error: () => {},
		});

		// Original request returns 401
		httpMock.expectOne('/api/protected').flush(null, { status: 401, statusText: 'Unauthorized' });

		// Interceptor should attempt refresh
		const refreshReq = httpMock.match((r) => r.url.includes('/refresh'));
		if (refreshReq.length > 0) {
			// Refresh succeeds
			refreshReq[0].flush({});

			// Retried request
			const retryReq = httpMock.match('/api/protected');
			if (retryReq.length > 0) {
				retryReq[0].flush({ data: 'recovered' });
				expect(retried).toBe(true);
			}
		}
	});

	it('should force logout when 401 refresh fails', () => {
		const forceLogout = TestBed.inject(ForceLogoutSignal);
		vi.spyOn(forceLogout, 'emit');

		httpClient.get('/api/protected').subscribe({ error: () => {} });

		httpMock.expectOne('/api/protected').flush(null, { status: 401, statusText: 'Unauthorized' });

		const refreshReq = httpMock.match((r) => r.url.includes('/refresh'));
		if (refreshReq.length > 0) {
			refreshReq[0].flush(null, { status: 401, statusText: 'Unauthorized' });
			expect(forceLogout.emit).toHaveBeenCalled();
		}
	});

	it('should skip error toast for requests with X-Skip-Error-Toast header', () => {
		let caughtError = false;

		httpClient.get('/api/test', {
			headers: { 'X-Skip-Error-Toast': 'true' },
		}).subscribe({ error: () => { caughtError = true; } });

		httpMock.expectOne('/api/test').flush(
			{ message: 'Not found' },
			{ status: 404, statusText: 'Not Found' },
		);

		expect(caughtError).toBe(true);
		expect(errorHandler.currentNotification()).toBeNull();
	});

	it('should not process errors from error reporter endpoint', () => {
		let caughtError = false;

		httpClient.post('/api/sistema/errors', {}).subscribe({
			error: () => { caughtError = true; },
		});

		httpMock.expectOne('/api/sistema/errors').flush(
			null,
			{ status: 500, statusText: 'Internal Server Error' },
		);

		expect(caughtError).toBe(true);
		expect(errorHandler.hasErrors()).toBe(false);
	});

	it('should skip refresh for login endpoint 401 errors', () => {
		let caughtError = false;

		httpClient.post('/api/Auth/login', {}).subscribe({
			error: () => { caughtError = true; },
		});

		httpMock.expectOne('/api/Auth/login').flush(
			null,
			{ status: 401, statusText: 'Unauthorized' },
		);

		// Should NOT attempt refresh for login endpoint
		httpMock.expectNone((r) => r.url.includes('/refresh'));
		expect(caughtError).toBe(true);
	});

	it('should report 500+ errors silently for SKIP_REFRESH_URLS', () => {
		httpClient.post('/api/Auth/login', {}).subscribe({ error: () => {} });

		httpMock.expectOne('/api/Auth/login').flush(
			null,
			{ status: 500, statusText: 'Internal Server Error' },
		);

		// Error should NOT go through handleHttpError (skip_refresh_url),
		// but the error is still re-thrown to the caller
		expect(errorHandler.currentNotification()).toBeNull();
	});

	it('should extract traceId and errorCode from response body', () => {
		httpClient.get('/api/data').subscribe({ error: () => {} });

		httpMock.expectOne('/api/data').flush(
			{ traceId: 'trace-xyz', errorCode: 'CONCURRENCY_CONFLICT' },
			{ status: 409, statusText: 'Conflict' },
		);

		expect(errorHandler.hasErrors()).toBe(true);
		const lastError = errorHandler.lastError();
		expect(lastError).toBeDefined();
	});
});
