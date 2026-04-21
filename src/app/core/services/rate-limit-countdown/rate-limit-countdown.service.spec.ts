import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RateLimitCountdownService } from './rate-limit-countdown.service';

describe('RateLimitCountdownService', () => {
	let service: RateLimitCountdownService;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({ providers: [RateLimitCountdownService] });
		service = TestBed.inject(RateLimitCountdownService);
	});

	afterEach(() => {
		service.stop();
		vi.useRealTimers();
	});

	// #region start / estado
	describe('start', () => {
		it('activa countdown con los segundos y endpoint indicados', () => {
			service.start(30, '/api/reports/heavy');

			expect(service.isActive()).toBe(true);
			expect(service.remaining()).toBe(30);
			expect(service.endpoint()).toBe('/api/reports/heavy');
		});

		it('clampa segundos a mínimo 1 si llega 0 o negativo', () => {
			service.start(0, '/api/x');
			expect(service.remaining()).toBe(1);

			service.stop();
			service.start(-5, '/api/x');
			expect(service.remaining()).toBe(1);
		});

		it('un segundo start con más tiempo reemplaza al actual', () => {
			service.start(10, '/api/x');
			service.start(30, '/api/y');

			expect(service.remaining()).toBe(30);
			expect(service.endpoint()).toBe('/api/y');
		});

		it('un segundo start con menos tiempo NO pisa al actual', () => {
			service.start(30, '/api/x');
			service.start(5, '/api/y');

			expect(service.remaining()).toBe(30);
			expect(service.endpoint()).toBe('/api/x');
		});
	});
	// #endregion

	// #region tick
	describe('tick', () => {
		it('decrementa remaining cada segundo', () => {
			service.start(3, '/api/x');

			vi.advanceTimersByTime(1_000);
			expect(service.remaining()).toBe(2);

			vi.advanceTimersByTime(1_000);
			expect(service.remaining()).toBe(1);
		});

		it('al llegar a 0 limpia endpoint e isActive', () => {
			service.start(2, '/api/x');

			vi.advanceTimersByTime(2_000);

			expect(service.remaining()).toBe(0);
			expect(service.endpoint()).toBeNull();
			expect(service.isActive()).toBe(false);
		});

		it('stop() cancela countdown en curso', () => {
			service.start(30, '/api/x');

			service.stop();

			expect(service.remaining()).toBe(0);
			expect(service.isActive()).toBe(false);
		});
	});
	// #endregion

	// #region parseRetryAfter
	describe('parseRetryAfter (static)', () => {
		it('lee valor del header Retry-After', () => {
			const err = new HttpErrorResponse({
				status: 429,
				headers: new HttpHeaders({ 'Retry-After': '42' }),
			});
			expect(RateLimitCountdownService.parseRetryAfter(err)).toBe(42);
		});

		it('lee valor del body retryAfterSeconds cuando no hay header', () => {
			const err = new HttpErrorResponse({
				status: 429,
				error: { retryAfterSeconds: 25 },
			});
			expect(RateLimitCountdownService.parseRetryAfter(err)).toBe(25);
		});

		it('usa default 60 cuando header y body no tienen valor', () => {
			const err = new HttpErrorResponse({ status: 429, error: null });
			expect(RateLimitCountdownService.parseRetryAfter(err)).toBe(60);
		});

		it('ignora header no numérico y cae al body', () => {
			const err = new HttpErrorResponse({
				status: 429,
				headers: new HttpHeaders({ 'Retry-After': 'never' }),
				error: { retryAfterSeconds: 15 },
			});
			expect(RateLimitCountdownService.parseRetryAfter(err)).toBe(15);
		});
	});
	// #endregion
});
