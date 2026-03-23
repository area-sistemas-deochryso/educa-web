// * Tests for rateLimitInterceptor — validates concurrency control and 429 handling.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { beforeEach, describe, expect, it } from 'vitest';

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

	// #region Pass-through for non-API
	describe('non-API requests', () => {
		it('should pass through non-API requests', () => {
			http.get('/assets/config.json').subscribe();
			const req = httpMock.expectOne('/assets/config.json');
			req.flush({});
		});
	});
	// #endregion

	// #region Normal API requests
	describe('API requests', () => {
		it('should allow normal API requests', () => {
			http.get('/api/test').subscribe((data) => {
				expect(data).toEqual({ ok: true });
			});

			const req = httpMock.expectOne('/api/test');
			expect(req.request.method).toBe('GET');
			req.flush({ ok: true });
		});
	});
	// #endregion

	// #region 429 handling
	describe('429 handling', () => {
		it('should activate cooldown on 429 response', () => {
			http.get('/api/test').subscribe({
				error: (err: HttpErrorResponse) => {
					expect(err.status).toBe(429);
				},
			});

			const req = httpMock.expectOne('/api/test');
			req.flush(
				{ retryAfterSeconds: 30 },
				{ status: 429, statusText: 'Too Many Requests' },
			);

			expect(rateLimitService.isCoolingDown()).toBe(true);
			expect(rateLimitService.remainingSeconds()).toBe(30);
		});

		it('should use default cooldown when no Retry-After', () => {
			http.get('/api/test').subscribe({ error: () => {} });

			const req = httpMock.expectOne('/api/test');
			req.flush(null, { status: 429, statusText: 'Too Many Requests' });

			expect(rateLimitService.isCoolingDown()).toBe(true);
			expect(rateLimitService.remainingSeconds()).toBe(60);
		});

		it('should block requests during cooldown', () => {
			rateLimitService.activateCooldown(30);

			http.get('/api/test').subscribe({
				error: (err: HttpErrorResponse) => {
					expect(err.status).toBe(429);
					expect(err.statusText).toContain('cooldown');
				},
			});

			httpMock.expectNone('/api/test');
		});
	});
	// #endregion

	// #region Non-429 errors pass through
	describe('non-429 errors', () => {
		it('should pass through 500 errors without cooldown', () => {
			http.get('/api/test').subscribe({
				error: (err: HttpErrorResponse) => {
					expect(err.status).toBe(500);
				},
			});

			const req = httpMock.expectOne('/api/test');
			req.flush(null, { status: 500, statusText: 'Server Error' });

			expect(rateLimitService.isCoolingDown()).toBe(false);
		});
	});
	// #endregion
});
// #endregion
