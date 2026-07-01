// Tests for rateLimitInterceptor: solo cola de concurrencia.
// NO cooldown global, NO 429 sintéticos, NO banner — el 429 del BE se propaga al caller.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { type Subscription } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { rateLimitInterceptor, resetRateLimitState } from './rate-limit.interceptor';

// #endregion

// #region Tests
describe('rateLimitInterceptor', () => {
	let http: HttpClient;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		resetRateLimitState();

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([rateLimitInterceptor])),
				provideHttpClientTesting(),
			],
		});

		http = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
		resetRateLimitState();
	});

	// #region Non-API pass-through
	describe('non-API requests', () => {
		it('pasa non-API requests sin tocar la cola', () => {
			http.get('/assets/config.json').subscribe();
			httpMock.expectOne('/assets/config.json').flush({});
		});
	});
	// #endregion

	// #region Bypass endpoints
	describe('endpoints que bypassean la cola', () => {
		it('reportes-usuario bypassea la cola', () => {
			http.post('/api/sistema/reportes-usuario', {}).subscribe();
			httpMock.expectOne('/api/sistema/reportes-usuario').flush({});
		});

		it('errors bypassea la cola', () => {
			http.post('/api/sistema/errors', {}).subscribe();
			httpMock.expectOne('/api/sistema/errors').flush({});
		});
	});
	// #endregion

	// #region Flujo normal
	describe('API requests', () => {
		it('permite request cuando está bajo el límite de concurrencia', () => {
			http.get('/api/test').subscribe((data) => {
				expect(data).toEqual({ ok: true });
			});

			const req = httpMock.expectOne('/api/test');
			expect(req.request.method).toBe('GET');
			req.flush({ ok: true });
		});

		it('libera slot al completar permitiendo siguiente request', () => {
			http.get('/api/first').subscribe();
			httpMock.expectOne('/api/first').flush({ ok: true });

			http.get('/api/second').subscribe();
			httpMock.expectOne('/api/second').flush({ ok: true });
		});

		it('permite múltiples concurrentes bajo el límite', () => {
			for (let i = 0; i < 5; i++) {
				http.get(`/api/concurrent-${i}`).subscribe();
			}
			for (let i = 0; i < 5; i++) {
				httpMock.expectOne(`/api/concurrent-${i}`).flush({ index: i });
			}
		});
	});
	// #endregion

	// #region 429 del BE se propaga al caller
	describe('429 del servidor', () => {
		it('propaga el 429 del BE al caller sin activar cooldown ni banner', () => {
			let receivedError: HttpErrorResponse | null = null;

			http.get('/api/test').subscribe({
				error: (err: HttpErrorResponse) => {
					receivedError = err;
				},
			});

			httpMock.expectOne('/api/test').flush(
				{ mensaje: 'Demasiadas solicitudes', retryAfterSeconds: 30 },
				{ status: 429, statusText: 'Too Many Requests' },
			);

			expect(receivedError).not.toBeNull();
			expect(receivedError!.status).toBe(429);
			// Error cuerpo preservado — el caller decide cómo mostrarlo
			expect((receivedError!.error as { mensaje: string }).mensaje).toBe('Demasiadas solicitudes');
		});

		it('un 429 en un endpoint NO bloquea otros endpoints', () => {
			// Primer endpoint recibe 429
			http.get('/api/reports/heavy').subscribe({ error: () => {} });
			httpMock.expectOne('/api/reports/heavy').flush(null, {
				status: 429,
				statusText: 'Too Many Requests',
			});

			// Segundo endpoint sigue funcionando normalmente
			http.get('/api/other').subscribe((data) => {
				expect(data).toEqual({ ok: true });
			});
			httpMock.expectOne('/api/other').flush({ ok: true });
		});
	});
	// #endregion

	// #region Errores no-429 pasan igual
	describe('errores no-429', () => {
		it('500 se propaga al caller', () => {
			let receivedError: HttpErrorResponse | null = null;

			http.get('/api/test').subscribe({
				error: (err: HttpErrorResponse) => {
					receivedError = err;
				},
			});

			httpMock.expectOne('/api/test').flush(null, {
				status: 500,
				statusText: 'Server Error',
			});

			expect(receivedError!.status).toBe(500);
		});
	});
	// #endregion

	// #region Concurrency queue
	describe('concurrency queue', () => {
		it('queues requests beyond MAX_CONCURRENT (10)', () => {
			const subs: Subscription[] = [];
			const inFlight: import('@angular/common/http/testing').TestRequest[] = [];

			for (let i = 0; i < 12; i++) {
				subs.push(http.get(`/api/req-${i}`).subscribe());
			}

			for (let i = 0; i < 10; i++) {
				inFlight.push(httpMock.expectOne(`/api/req-${i}`));
			}
			httpMock.expectNone('/api/req-10');
			httpMock.expectNone('/api/req-11');

			inFlight[0].flush({ ok: true });
			inFlight[1].flush({ ok: true });

			httpMock.expectOne('/api/req-10').flush({ ok: true });
			httpMock.expectOne('/api/req-11').flush({ ok: true });

			for (let i = 2; i < 10; i++) {
				inFlight[i].flush({ ok: true });
			}

			subs.forEach((s) => s.unsubscribe());
		});

		it('releases slot on successful completion', () => {
			const subs: Subscription[] = [];
			const inFlight: import('@angular/common/http/testing').TestRequest[] = [];

			for (let i = 0; i < 11; i++) {
				subs.push(http.get(`/api/slot-${i}`).subscribe());
			}

			for (let i = 0; i < 10; i++) {
				inFlight.push(httpMock.expectOne(`/api/slot-${i}`));
			}
			httpMock.expectNone('/api/slot-10');

			inFlight[0].flush({ ok: true });

			httpMock.expectOne('/api/slot-10').flush({ ok: true });

			for (let i = 1; i < 10; i++) {
				inFlight[i].flush({ ok: true });
			}

			subs.forEach((s) => s.unsubscribe());
		});

		it('releases slot on error (500)', () => {
			const subs: Subscription[] = [];
			const inFlight: import('@angular/common/http/testing').TestRequest[] = [];

			for (let i = 0; i < 11; i++) {
				subs.push(http.get(`/api/err-${i}`).subscribe({ error: () => {} }));
			}

			for (let i = 0; i < 10; i++) {
				inFlight.push(httpMock.expectOne(`/api/err-${i}`));
			}
			httpMock.expectNone('/api/err-10');

			inFlight[0].flush(null, { status: 500, statusText: 'Server Error' });

			httpMock.expectOne('/api/err-10').flush({ ok: true });

			for (let i = 1; i < 10; i++) {
				inFlight[i].flush({ ok: true });
			}

			subs.forEach((s) => s.unsubscribe());
		});

		it('cancel queued request removes it from the wait queue', () => {
			const subs: Subscription[] = [];
			const inFlight: import('@angular/common/http/testing').TestRequest[] = [];

			for (let i = 0; i < 10; i++) {
				subs.push(http.get(`/api/cancel-${i}`).subscribe());
			}
			const queuedSub = http.get('/api/cancel-queued').subscribe();

			for (let i = 0; i < 10; i++) {
				inFlight.push(httpMock.expectOne(`/api/cancel-${i}`));
			}
			httpMock.expectNone('/api/cancel-queued');

			queuedSub.unsubscribe();

			for (let i = 0; i < 10; i++) {
				inFlight[i].flush({ ok: true });
			}

			httpMock.expectNone('/api/cancel-queued');

			subs.forEach((s) => s.unsubscribe());
		});

		it('queued requests are dispatched in FIFO order', () => {
			const subs: Subscription[] = [];
			const completionOrder: string[] = [];
			const inFlight: import('@angular/common/http/testing').TestRequest[] = [];

			for (let i = 0; i < 10; i++) {
				subs.push(http.get(`/api/fifo-${i}`).subscribe());
			}

			for (let i = 10; i < 13; i++) {
				subs.push(
					http.get(`/api/fifo-${i}`).subscribe({
						next: () => completionOrder.push(`fifo-${i}`),
					}),
				);
			}

			for (let i = 0; i < 10; i++) {
				inFlight.push(httpMock.expectOne(`/api/fifo-${i}`));
			}

			inFlight[0].flush({ ok: true });
			const req10 = httpMock.expectOne('/api/fifo-10');

			inFlight[1].flush({ ok: true });
			const req11 = httpMock.expectOne('/api/fifo-11');

			inFlight[2].flush({ ok: true });
			const req12 = httpMock.expectOne('/api/fifo-12');

			req10.flush({ order: 0 });
			req11.flush({ order: 1 });
			req12.flush({ order: 2 });

			expect(completionOrder).toEqual(['fifo-10', 'fifo-11', 'fifo-12']);

			for (let i = 3; i < 10; i++) {
				inFlight[i].flush({ ok: true });
			}

			subs.forEach((s) => s.unsubscribe());
		});
	});
	// #endregion
});
// #endregion
