// Tests for rateLimitInterceptor: solo cola de concurrencia.
// NO cooldown global, NO 429 sintéticos, NO banner — el 429 del BE se propaga al caller.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { rateLimitInterceptor } from './rate-limit.interceptor';

// #endregion

// #region Tests
describe('rateLimitInterceptor', () => {
	let http: HttpClient;
	let httpMock: HttpTestingController;

	beforeEach(() => {
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
});
// #endregion
