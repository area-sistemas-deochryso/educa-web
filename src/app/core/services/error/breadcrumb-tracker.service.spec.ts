// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BreadcrumbTrackerService } from './breadcrumb-tracker.service';
import { SKIP_BREADCRUMBS, type BreadcrumbIngestPayload } from './breadcrumb-tracker.models';
// #endregion

const ENDPOINT = '/api/sistema/breadcrumbs';
const ALLOWED_EVENT_KEYS = ['tipo', 'offsetMs', 'ruta', 'metodo', 'statusCode', 'errorClass'];

// #region Tests
describe('BreadcrumbTrackerService', () => {
	let service: BreadcrumbTrackerService;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		vi.useFakeTimers();
		TestBed.configureTestingModule({
			providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
		});
		service = TestBed.inject(BreadcrumbTrackerService);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
		vi.useRealTimers();
	});

	function expectSingleIngest(): BreadcrumbIngestPayload {
		const req = httpMock.expectOne(ENDPOINT);
		expect(req.request.method).toBe('POST');
		return req.request.body as BreadcrumbIngestPayload;
	}

	it('sends nothing while there are no errors', () => {
		service.trackHttp('GET', '/api/cursos', 200, 'r1');
		service.trackHttp('GET', '/api/cursos/5', 200, 'r2');
		vi.advanceTimersByTime(120_000);

		httpMock.expectNone(ENDPOINT);
	});

	it('never keeps more than 50 events in the buffer', () => {
		for (let i = 0; i < 80; i++) service.trackHttp('GET', `/api/cursos/${i}`, 200, `r${i}`);

		service.onHttpError(500, '/api/fallo', 'GET', 'corr-1');

		expect(expectSingleIngest().events).toHaveLength(50);
	});

	it('normalizes routes and drops query strings before sending', () => {
		service.trackHttp('GET', '/api/estudiantes/123?dni=12345678&token=abc#frag', 200, 'r1');

		service.onHttpError(500, 'https://host/api/notas/987?x=1', 'POST', 'corr-1');

		const { events } = expectSingleIngest();
		expect(events[0].ruta).toBe('/api/estudiantes/:id');
		expect(events[1].ruta).toBe('/api/notas/:id');
		expect(JSON.stringify(events)).not.toMatch(/dni|token|frag|\?|12345678/);
	});

	it('only sends the fields allowed by ADR-0008', () => {
		service.trackHttp('POST', '/api/x', 201, 'r1');
		service.onClientError('TypeError', 'corr-1');

		const payload = expectSingleIngest();
		expect(Object.keys(payload).sort()).toEqual(['correlationId', 'events', 'sessionId']);
		for (const event of payload.events) {
			expect(Object.keys(event).every((k) => ALLOWED_EVENT_KEYS.includes(k))).toBe(true);
		}
	});

	it('expresses time as offsetMs relative to the error', () => {
		service.trackHttp('GET', '/api/a', 200, 'r1');
		vi.advanceTimersByTime(2_000);

		service.onHttpError(500, '/api/b', 'GET', 'corr-1');

		const { events } = expectSingleIngest();
		expect(events[0].offsetMs).toBe(2_000);
		expect(events[1].offsetMs).toBe(0);
	});

	it('records the failing request once even if the interceptor reports it afterwards', () => {
		service.onHttpError(500, '/api/b', 'GET', 'corr-1');
		service.trackHttp('GET', '/api/b', 500, 'corr-1');
		service.onHttpError(500, '/api/c', 'GET', 'corr-2');

		const [first, second] = httpMock.match(ENDPOINT);
		expect((first.request.body as BreadcrumbIngestPayload).events).toHaveLength(1);
		expect((second.request.body as BreadcrumbIngestPayload).events.map((e) => e.ruta)).toEqual(['/api/b', '/api/c']);
	});

	it.each([401, 403, 404, 409, 422, 429, 0, 200])('does not send for HTTP %i', (status) => {
		service.onHttpError(status, '/api/x', 'GET', 'corr-1');

		httpMock.expectNone(ENDPOINT);
	});

	it.each([500, 503, 400])('sends for HTTP %i', (status) => {
		service.onHttpError(status, '/api/x', 'GET', 'corr-1');

		expectSingleIngest();
	});

	it('does not send an HTTP error without a correlationId', () => {
		service.onHttpError(500, '/api/x', 'GET', undefined);

		httpMock.expectNone(ENDPOINT);
	});

	it('sends the error class on an uncaught exception', () => {
		service.onClientError('RangeError', 'corr-1');

		const { events } = expectSingleIngest();
		expect(events.at(-1)).toMatchObject({ tipo: 'error', errorClass: 'RangeError' });
	});

	it('marks the ingest request so interceptors skip it', () => {
		service.onHttpError(500, '/api/x', 'GET', 'corr-1');

		const req = httpMock.expectOne(ENDPOINT);
		expect(req.request.context.get(SKIP_BREADCRUMBS)).toBe(true);
		expect(req.request.headers.get('X-Skip-Error-Toast')).toBe('true');
	});

	describe('loop prevention', () => {
		it('makes a single call when the send fails and does not retry', async () => {
			service.onHttpError(500, '/api/x', 'GET', 'corr-1');
			httpMock.expectOne(ENDPOINT).flush('boom', { status: 500, statusText: 'Server Error' });
			await vi.advanceTimersByTimeAsync(300_000);

			httpMock.expectNone(ENDPOINT);
		});

		it('does not capture its own endpoint, nor trigger on its failure', () => {
			service.trackHttp('POST', ENDPOINT, 500, 'self');
			service.onHttpError(500, ENDPOINT, 'POST', 'self');

			httpMock.expectNone(ENDPOINT);
		});

		it('sends once per correlationId', () => {
			service.onHttpError(500, '/api/x', 'GET', 'corr-1');
			service.onHttpError(500, '/api/x', 'GET', 'corr-1');
			service.onClientError('Error', 'corr-1');

			expectSingleIngest();
		});

		it('caps sends per minute and recovers after the window', () => {
			for (let i = 0; i < 6; i++) service.onHttpError(500, '/api/x', 'GET', `corr-${i}`);
			expect(httpMock.match(ENDPOINT)).toHaveLength(3);

			vi.advanceTimersByTime(61_000);
			service.onHttpError(500, '/api/x', 'GET', 'corr-after');

			expectSingleIngest();
		});
	});

	it('reset() clears buffer and send control', () => {
		service.trackHttp('GET', '/api/viejo', 200, 'r1');
		service.reset();

		service.onHttpError(500, '/api/nuevo', 'GET', 'corr-1');

		expect(expectSingleIngest().events.map((e) => e.ruta)).toEqual(['/api/nuevo']);
	});
});
// #endregion
