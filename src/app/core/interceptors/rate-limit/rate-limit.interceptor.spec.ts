// * Tests for rateLimitInterceptor — validates concurrency control, queue, cooldown, and 429 handling.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { rateLimitInterceptor } from './rate-limit.interceptor';
import { RateLimitService } from '@core/services/rate-limit/rate-limit.service';

// #endregion

// #region Tests
describe('rateLimitInterceptor', () => {
	let http: HttpClient;
	let httpMock: HttpTestingController;
	let rateLimitService: RateLimitService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([rateLimitInterceptor])),
				provideHttpClientTesting(),
				RateLimitService,
			],
		});

		http = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
		rateLimitService = TestBed.inject(RateLimitService);
	});

	afterEach(() => {
		httpMock.verify();
	});

	// #region Non-API pass-through
	describe('non-API requests', () => {
		it('should pass through non-API requests without rate limiting', () => {
			http.get('/assets/config.json').subscribe();
			const req = httpMock.expectOne('/assets/config.json');
			req.flush({});
		});

		it('should pass through static file requests', () => {
			http.get('/manifest.webmanifest').subscribe();
			const req = httpMock.expectOne('/manifest.webmanifest');
			req.flush({});
		});
	});
	// #endregion

	// #region Normal API flow
	describe('normal API requests', () => {
		it('should allow API requests under concurrency limit', () => {
			http.get('/api/test').subscribe((data) => {
				expect(data).toEqual({ ok: true });
			});

			const req = httpMock.expectOne('/api/test');
			expect(req.request.method).toBe('GET');
			req.flush({ ok: true });
		});

		it('should release slot after request completes', () => {
			// Send first request, complete it
			http.get('/api/first').subscribe();
			httpMock.expectOne('/api/first').flush({ ok: true });

			// Second request should work fine
			http.get('/api/second').subscribe();
			httpMock.expectOne('/api/second').flush({ ok: true });
		});
	});
	// #endregion

	// #region 429 handling
	describe('429 response handling', () => {
		it('should activate cooldown on 429 from server', () => {
			http.get('/api/test').subscribe({
				error: (err: HttpErrorResponse) => {
					expect(err.status).toBe(429);
				},
			});

			httpMock.expectOne('/api/test').flush(
				{ retryAfterSeconds: 30 },
				{ status: 429, statusText: 'Too Many Requests' },
			);

			expect(rateLimitService.isCoolingDown()).toBe(true);
			expect(rateLimitService.remainingSeconds()).toBe(30);
		});

		it('should use default 60s cooldown when no Retry-After header or body', () => {
			http.get('/api/test').subscribe({ error: () => {} });

			httpMock.expectOne('/api/test').flush(null, {
				status: 429,
				statusText: 'Too Many Requests',
			});

			expect(rateLimitService.isCoolingDown()).toBe(true);
			expect(rateLimitService.remainingSeconds()).toBe(60);
		});

		it('should parse Retry-After from response body field', () => {
			http.get('/api/test').subscribe({ error: () => {} });

			httpMock.expectOne('/api/test').flush(
				{ retryAfterSeconds: 45 },
				{ status: 429, statusText: 'Too Many Requests' },
			);

			expect(rateLimitService.remainingSeconds()).toBe(45);
		});
	});
	// #endregion

	// #region Cooldown blocking
	describe('cooldown blocking', () => {
		it('should block ALL API requests during cooldown', () => {
			rateLimitService.activateCooldown(30);

			http.get('/api/test').subscribe({
				error: (err: HttpErrorResponse) => {
					expect(err.status).toBe(429);
					expect(err.statusText).toContain('cooldown');
				},
			});

			// No request should reach the server
			httpMock.expectNone('/api/test');
		});

		it('should still allow non-API requests during cooldown', () => {
			rateLimitService.activateCooldown(30);

			http.get('/assets/i18n/es.json').subscribe();

			const req = httpMock.expectOne('/assets/i18n/es.json');
			req.flush({});
		});
	});
	// #endregion

	// #region Non-429 errors pass through
	describe('non-429 errors', () => {
		it('should pass through 500 errors without activating cooldown', () => {
			http.get('/api/test').subscribe({
				error: (err: HttpErrorResponse) => {
					expect(err.status).toBe(500);
				},
			});

			httpMock.expectOne('/api/test').flush(null, {
				status: 500,
				statusText: 'Server Error',
			});

			expect(rateLimitService.isCoolingDown()).toBe(false);
		});

		it('should pass through 404 errors without cooldown', () => {
			http.get('/api/notfound').subscribe({
				error: (err: HttpErrorResponse) => {
					expect(err.status).toBe(404);
				},
			});

			httpMock.expectOne('/api/notfound').flush(null, {
				status: 404,
				statusText: 'Not Found',
			});

			expect(rateLimitService.isCoolingDown()).toBe(false);
		});
	});
	// #endregion

	// #region Concurrency control
	describe('concurrency control', () => {
		it('should allow multiple concurrent requests up to the limit', () => {
			// Fire 5 concurrent requests — all should reach the server
			for (let i = 0; i < 5; i++) {
				http.get(`/api/concurrent-${i}`).subscribe();
			}

			for (let i = 0; i < 5; i++) {
				const req = httpMock.expectOne(`/api/concurrent-${i}`);
				req.flush({ index: i });
			}
		});

		it('should release slots allowing queued requests to proceed', () => {
			// Fire request, complete it, fire another — slot should be free
			http.get('/api/first').subscribe();
			httpMock.expectOne('/api/first').flush({});

			http.get('/api/second').subscribe();
			httpMock.expectOne('/api/second').flush({});

			http.get('/api/third').subscribe();
			httpMock.expectOne('/api/third').flush({});
		});
	});
	// #endregion
});
// #endregion
