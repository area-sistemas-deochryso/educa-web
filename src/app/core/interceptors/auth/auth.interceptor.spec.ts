// * Tests for auth interceptor header injection.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { authInterceptor } from './auth.interceptor';
import { StorageService } from '@app/core/services';

// #endregion
// #region Implementation
describe('authInterceptor', () => {
	let httpClient: HttpClient;
	let httpMock: HttpTestingController;
	let storageServiceMock: Partial<StorageService>;

	beforeEach(() => {
		storageServiceMock = {
			getToken: vi.fn().mockReturnValue(null),
		};

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([authInterceptor])),
				provideHttpClientTesting(),
				{ provide: StorageService, useValue: storageServiceMock },
			],
		});

		httpClient = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('should not add Authorization header when no token exists', () => {
		storageServiceMock.getToken = vi.fn().mockReturnValue(null);

		httpClient.get('/api/test').subscribe();

		const req = httpMock.expectOne('/api/test');
		expect(req.request.headers.has('Authorization')).toBe(false);
		req.flush({});
	});

	it('should add Authorization header when token exists', () => {
		storageServiceMock.getToken = vi.fn().mockReturnValue('test-token-123');

		httpClient.get('/api/test').subscribe();

		const req = httpMock.expectOne('/api/test');
		expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');
		req.flush({});
	});

	it('should NOT add Authorization header for login endpoint even with token', () => {
		storageServiceMock.getToken = vi.fn().mockReturnValue('test-token-123');

		httpClient.post('/api/Auth/login', {}).subscribe();

		const req = httpMock.expectOne('/api/Auth/login');
		expect(req.request.headers.has('Authorization')).toBe(false);
		req.flush({});
	});

	it('should add Authorization header for non-login endpoints', () => {
		storageServiceMock.getToken = vi.fn().mockReturnValue('my-token');

		httpClient.get('/api/users').subscribe();

		const req = httpMock.expectOne('/api/users');
		expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
		req.flush({});
	});

	it('should preserve existing headers when adding Authorization', () => {
		storageServiceMock.getToken = vi.fn().mockReturnValue('my-token');

		httpClient
			.get('/api/test', {
				headers: { 'X-Custom-Header': 'custom-value' },
			})
			.subscribe();

		const req = httpMock.expectOne('/api/test');
		expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
		expect(req.request.headers.get('X-Custom-Header')).toBe('custom-value');
		req.flush({});
	});
});
// #endregion
