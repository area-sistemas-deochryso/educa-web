// * Security contract tests for credentialsInterceptor.
// * Without withCredentials=true, HttpOnly cookies are NOT sent = auth silently broken.
// #region Imports
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { credentialsInterceptor } from './credentials.interceptor';

// #endregion

// #region Tests
describe('credentialsInterceptor — Security Contract', () => {
	let http: HttpClient;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([credentialsInterceptor])),
				provideHttpClientTesting(),
			],
		});

		http = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	// #region INV: withCredentials on every request
	describe('INV: Every HTTP request includes credentials (cookies)', () => {
		it('should add withCredentials=true to GET requests', () => {
			http.get('/api/test').subscribe();

			const req = httpMock.expectOne('/api/test');
			expect(req.request.withCredentials).toBe(true);
			req.flush({});
		});

		it('should add withCredentials=true to POST requests', () => {
			http.post('/api/test', { data: 'value' }).subscribe();

			const req = httpMock.expectOne('/api/test');
			expect(req.request.withCredentials).toBe(true);
			expect(req.request.body).toEqual({ data: 'value' });
			req.flush({});
		});

		it('should add withCredentials=true to PUT requests', () => {
			http.put('/api/test/1', { name: 'updated' }).subscribe();

			const req = httpMock.expectOne('/api/test/1');
			expect(req.request.withCredentials).toBe(true);
			req.flush({});
		});

		it('should add withCredentials=true to DELETE requests', () => {
			http.delete('/api/test/1').subscribe();

			const req = httpMock.expectOne('/api/test/1');
			expect(req.request.withCredentials).toBe(true);
			req.flush({});
		});

		it('should preserve existing custom headers', () => {
			http.get('/api/test', { headers: { 'X-Custom': 'value' } }).subscribe();

			const req = httpMock.expectOne('/api/test');
			expect(req.request.withCredentials).toBe(true);
			expect(req.request.headers.get('X-Custom')).toBe('value');
			req.flush({});
		});
	});
	// #endregion
});
// #endregion
