// * Tests for auth interceptor (pass-through — cookies handle auth via credentialsInterceptor).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { authInterceptor } from './auth.interceptor';

// #endregion
// #region Implementation
describe('authInterceptor', () => {
	let httpClient: HttpClient;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([authInterceptor])),
				provideHttpClientTesting(),
			],
		});

		httpClient = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('should pass the request through without modifying headers', () => {
		httpClient.get('/api/test').subscribe();

		const req = httpMock.expectOne('/api/test');
		expect(req.request.headers.has('Authorization')).toBe(false);
		req.flush({});
	});

	it('should not add Authorization header for any endpoint', () => {
		httpClient.get('/api/users').subscribe();

		const req = httpMock.expectOne('/api/users');
		expect(req.request.headers.has('Authorization')).toBe(false);
		req.flush({});
	});

	it('should not add Authorization header for login endpoint', () => {
		httpClient.post('/api/Auth/login', {}).subscribe();

		const req = httpMock.expectOne('/api/Auth/login');
		expect(req.request.headers.has('Authorization')).toBe(false);
		req.flush({});
	});

	it('should preserve existing headers without modification', () => {
		httpClient
			.get('/api/test', {
				headers: { 'X-Custom-Header': 'custom-value' },
			})
			.subscribe();

		const req = httpMock.expectOne('/api/test');
		expect(req.request.headers.has('Authorization')).toBe(false);
		expect(req.request.headers.get('X-Custom-Header')).toBe('custom-value');
		req.flush({});
	});
});
// #endregion
