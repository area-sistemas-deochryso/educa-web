// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorReporterService } from './error-reporter.service';
import { ActivityTrackerService } from './activity-tracker.service';
// #endregion

// #region Mocks

vi.mock('./error-reporter-outbox.helper', () => ({
	saveReportToOutbox: vi.fn().mockResolvedValue(undefined),
	readPendingReports: vi.fn().mockResolvedValue([]),
	removeReportFromOutbox: vi.fn().mockResolvedValue(undefined),
	MAX_PENDING: 50,
}));

import {
	saveReportToOutbox,
	readPendingReports,
	removeReportFromOutbox,
} from './error-reporter-outbox.helper';

const ENDPOINT = '/api/sistema/errors';

function createActivityMock() {
	return {
		getBreadcrumbs: vi.fn().mockReturnValue([]),
		track: vi.fn(),
	};
}

// #endregion

// #region Tests
describe('ErrorReporterService', () => {
	let service: ErrorReporterService;
	let httpMock: HttpTestingController;
	let activityMock: ReturnType<typeof createActivityMock>;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.mocked(saveReportToOutbox).mockClear();
		vi.mocked(readPendingReports).mockClear().mockResolvedValue([]);
		vi.mocked(removeReportFromOutbox).mockClear();

		activityMock = createActivityMock();

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([])),
				provideHttpClientTesting(),
				ErrorReporterService,
				{ provide: ActivityTrackerService, useValue: activityMock },
			],
		});

		httpMock = TestBed.inject(HttpTestingController);
		service = TestBed.inject(ErrorReporterService);
	});

	afterEach(() => {
		httpMock.verify();
		vi.useRealTimers();
	});

	// #region reportHttpError — payload shape
	describe('reportHttpError — payload shape', () => {
		it('sends POST to errors endpoint with correct payload shape', () => {
			service.reportHttpError(500, '/api/test/resource', 'GET', 'ERR001', 'corr-1');

			const req = httpMock.expectOne(ENDPOINT);
			expect(req.request.method).toBe('POST');

			const body = req.request.body;
			expect(body.httpStatus).toBe(500);
			expect(body.httpMethod).toBe('GET');
			expect(body.errorCode).toBe('ERR001');
			expect(body.correlationId).toBe('corr-1');
			expect(body.breadcrumbs).toEqual([]);
			expect(body.plataforma).toBe('WEB');
			expect(body.userAgent).toBeTruthy();
			req.flush({});
		});

		it('classifies 500 as BACKEND origin with CRITICAL severity', () => {
			service.reportHttpError(500, '/api/foo');

			const req = httpMock.expectOne(ENDPOINT);
			expect(req.request.body.origen).toBe('BACKEND');
			expect(req.request.body.severidad).toBe('CRITICAL');
			req.flush({});
		});

		it('classifies 400 as FRONTEND origin with ERROR severity', () => {
			service.reportHttpError(400, '/api/foo');

			const req = httpMock.expectOne(ENDPOINT);
			expect(req.request.body.origen).toBe('FRONTEND');
			expect(req.request.body.severidad).toBe('ERROR');
			req.flush({});
		});

		it('classifies status 0 as NETWORK origin with CRITICAL severity', () => {
			service.reportHttpError(0, '/api/foo');

			const req = httpMock.expectOne(ENDPOINT);
			expect(req.request.body.origen).toBe('NETWORK');
			expect(req.request.body.severidad).toBe('CRITICAL');
			req.flush({});
		});

		it('includes X-Skip-Error-Toast header', () => {
			service.reportHttpError(500, '/api/foo');

			const req = httpMock.expectOne(ENDPOINT);
			expect(req.request.headers.get('X-Skip-Error-Toast')).toBe('true');
			req.flush({});
		});
	});
	// #endregion

	// #region Rate limiting
	describe('rate limiting (canReport)', () => {
		it('allows up to 5 reports per minute', () => {
			for (let i = 0; i < 5; i++) {
				service.reportHttpError(500, `/api/resource-${i}`);
			}
			const reqs = httpMock.match(ENDPOINT);
			expect(reqs.length).toBe(5);
			reqs.forEach((r) => r.flush({}));
		});

		it('blocks the 6th report within the same minute', () => {
			for (let i = 0; i < 6; i++) {
				service.reportHttpError(500, `/api/resource-${i}`);
			}
			const reqs = httpMock.match(ENDPOINT);
			expect(reqs.length).toBe(5);
			reqs.forEach((r) => r.flush({}));
		});

		it('resets the counter after 60 seconds', () => {
			for (let i = 0; i < 5; i++) {
				service.reportHttpError(500, `/api/r-${i}`);
			}
			httpMock.match(ENDPOINT).forEach((r) => r.flush({}));

			vi.advanceTimersByTime(60_001);

			service.reportHttpError(500, '/api/after-reset');
			const reqs = httpMock.match(ENDPOINT);
			expect(reqs.length).toBe(1);
			reqs.forEach((r) => r.flush({}));
		});
	});
	// #endregion

	// #region Dedup
	describe('dedup', () => {
		it('deduplicates same URL + status within 5 seconds', () => {
			service.reportHttpError(500, '/api/dup');
			service.reportHttpError(500, '/api/dup');
			service.reportHttpError(500, '/api/dup');

			const reqs = httpMock.match(ENDPOINT);
			expect(reqs.length).toBe(1);
			reqs.forEach((r) => r.flush({}));
		});

		it('allows same URL + status after 5 seconds', () => {
			service.reportHttpError(500, '/api/dup');
			httpMock.match(ENDPOINT).forEach((r) => r.flush({}));

			vi.advanceTimersByTime(5_001);

			service.reportHttpError(500, '/api/dup');
			const reqs = httpMock.match(ENDPOINT);
			expect(reqs.length).toBe(1);
			reqs.forEach((r) => r.flush({}));
		});

		it('allows same URL with different status immediately', () => {
			service.reportHttpError(500, '/api/dup');
			service.reportHttpError(400, '/api/dup');

			const reqs = httpMock.match(ENDPOINT);
			expect(reqs.length).toBe(2);
			reqs.forEach((r) => r.flush({}));
		});
	});
	// #endregion

	// #region Anti-loop
	describe('anti-loop', () => {
		it('never reports errors from own endpoint', () => {
			service.reportHttpError(500, '/api/sistema/errors');

			httpMock.expectNone(ENDPOINT);
		});
	});
	// #endregion

	// #region 429 filter
	describe('429 filter', () => {
		it('never reports HTTP 429 errors', () => {
			service.reportHttpError(429, '/api/some-endpoint');

			httpMock.expectNone(ENDPOINT);
		});
	});
	// #endregion

	// #region reportSlowRequest
	describe('reportSlowRequest', () => {
		it('sends with NETWORK origin, SLOW_REQUEST code, WARNING severity', () => {
			service.reportSlowRequest('GET', '/api/slow', 200, 15000, 'corr-slow');

			const req = httpMock.expectOne(ENDPOINT);
			const body = req.request.body;
			expect(body.origen).toBe('NETWORK');
			expect(body.errorCode).toBe('SLOW_REQUEST');
			expect(body.severidad).toBe('WARNING');
			expect(body.correlationId).toBe('corr-slow');
			expect(body.mensaje).toContain('15000ms');
			req.flush({});
		});

		it('deduplicates slow requests for same URL within 5s', () => {
			service.reportSlowRequest('GET', '/api/slow', 200, 12000);
			service.reportSlowRequest('GET', '/api/slow', 200, 13000);

			const reqs = httpMock.match(ENDPOINT);
			expect(reqs.length).toBe(1);
			reqs.forEach((r) => r.flush({}));
		});
	});
	// #endregion

	// #region reportClientError
	describe('reportClientError', () => {
		it('sends with FRONTEND origin, CRITICAL severity', () => {
			service.reportClientError('Unhandled TypeError', 'Error stack trace');

			const req = httpMock.expectOne(ENDPOINT);
			const body = req.request.body;
			expect(body.origen).toBe('FRONTEND');
			expect(body.severidad).toBe('CRITICAL');
			expect(body.mensaje).toBe('Unhandled TypeError');
			expect(body.stackTrace).toBe('Error stack trace');
			req.flush({});
		});

		it('truncates message to 500 characters', () => {
			const longMsg = 'x'.repeat(600);
			service.reportClientError(longMsg);

			const req = httpMock.expectOne(ENDPOINT);
			expect(req.request.body.mensaje.length).toBe(500);
			req.flush({});
		});
	});
	// #endregion

	// #region Offline outbox — send failure
	describe('offline outbox (send failure)', () => {
		it('saves to outbox on non-429 send failure', async () => {
			service.reportHttpError(500, '/api/fail');

			const req = httpMock.expectOne(ENDPOINT);
			req.flush(null, { status: 503, statusText: 'Service Unavailable' });

			await vi.advanceTimersByTimeAsync(0);
			expect(saveReportToOutbox).toHaveBeenCalledTimes(1);
		});

		it('does NOT save to outbox on 429 send failure', async () => {
			service.reportHttpError(500, '/api/fail-429');

			const req = httpMock.expectOne(ENDPOINT);
			req.flush(null, { status: 429, statusText: 'Too Many Requests' });

			await vi.advanceTimersByTimeAsync(0);
			expect(saveReportToOutbox).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region flushPending
	describe('flushPending', () => {
		it('reads pending and sends each on periodic flush', async () => {
			const pendingPayload = {
				correlationId: null,
				origen: 'NETWORK' as const,
				mensaje: 'test',
				stackTrace: null,
				url: '/api/test',
				httpMethod: 'GET',
				httpStatus: 0,
				errorCode: null,
				severidad: 'CRITICAL' as const,
				plataforma: 'WEB' as const,
				userAgent: 'test',
				sourceLocation: null,
				requestBody: null,
				responseBody: null,
				breadcrumbs: [],
			};
			vi.mocked(readPendingReports).mockResolvedValue([
				{ key: 1, value: pendingPayload },
			]);

			// Trigger periodic flush (interval is 30s)
			await vi.advanceTimersByTimeAsync(30_001);

			const reqs = httpMock.match(ENDPOINT);
			expect(reqs.length).toBeGreaterThanOrEqual(1);
			reqs.forEach((r) => r.flush({}));
		});

		it('removes entry from outbox on successful flush', async () => {
			const pendingPayload = {
				correlationId: null,
				origen: 'BACKEND' as const,
				mensaje: 'test error',
				stackTrace: null,
				url: '/api/test',
				httpMethod: 'GET',
				httpStatus: 500,
				errorCode: null,
				severidad: 'CRITICAL' as const,
				plataforma: 'WEB' as const,
				userAgent: 'test',
				sourceLocation: null,
				requestBody: null,
				responseBody: null,
				breadcrumbs: [],
			};
			vi.mocked(readPendingReports).mockResolvedValue([
				{ key: 42, value: pendingPayload },
			]);

			await vi.advanceTimersByTimeAsync(30_001);

			const reqs = httpMock.match(ENDPOINT);
			expect(reqs.length).toBeGreaterThanOrEqual(1);
			reqs.forEach((r) => r.flush({}));

			await vi.advanceTimersByTimeAsync(0);
			expect(removeReportFromOutbox).toHaveBeenCalledWith(42);
		});
	});
	// #endregion

	// #region resetOnLogout
	describe('resetOnLogout', () => {
		it('clears dedup map and report count, allowing new reports', () => {
			for (let i = 0; i < 5; i++) {
				service.reportHttpError(500, `/api/logout-test-${i}`);
			}
			httpMock.match(ENDPOINT).forEach((r) => r.flush({}));

			// 6th would be blocked
			service.reportHttpError(500, '/api/blocked');
			httpMock.expectNone(ENDPOINT);

			service.resetOnLogout();

			// Now reports work again
			service.reportHttpError(500, '/api/after-logout');
			const reqs = httpMock.match(ENDPOINT);
			expect(reqs.length).toBe(1);
			reqs.forEach((r) => r.flush({}));
		});

		it('clears dedup allowing previously-deduped URLs to report again', () => {
			service.reportHttpError(500, '/api/dup-logout');
			httpMock.match(ENDPOINT).forEach((r) => r.flush({}));

			// Same URL deduped
			service.reportHttpError(500, '/api/dup-logout');
			httpMock.expectNone(ENDPOINT);

			service.resetOnLogout();

			service.reportHttpError(500, '/api/dup-logout');
			const reqs = httpMock.match(ENDPOINT);
			expect(reqs.length).toBe(1);
			reqs.forEach((r) => r.flush({}));
		});
	});
	// #endregion

	// #region SW revalidation failure
	describe('SW revalidation failure', () => {
		it('handles REVALIDATION_FAILED message by saving to outbox', async () => {
			const handler = (service as unknown as { swMessageHandler: (e: MessageEvent) => void }).swMessageHandler;

			handler(new MessageEvent('message', {
				data: {
					type: 'REVALIDATION_FAILED',
					payload: { originalUrl: '/api/cached-resource' },
				},
			}));

			await vi.advanceTimersByTimeAsync(0);
			expect(saveReportToOutbox).toHaveBeenCalledTimes(1);
			const savedPayload = vi.mocked(saveReportToOutbox).mock.calls[0][0] as Record<string, unknown>;
			expect(savedPayload['origen']).toBe('NETWORK');
			expect(savedPayload['errorCode']).toBe('NETWORK_REVALIDATION_FAILED');
			expect(savedPayload['severidad']).toBe('WARNING');
		});

		it('deduplicates SW failures within 10 seconds', async () => {
			const handler = (service as unknown as { swMessageHandler: (e: MessageEvent) => void }).swMessageHandler;
			const event = new MessageEvent('message', {
				data: { type: 'REVALIDATION_FAILED', payload: { url: '/api/res' } },
			});

			handler(event);
			handler(event);
			handler(event);

			await vi.advanceTimersByTimeAsync(0);
			expect(saveReportToOutbox).toHaveBeenCalledTimes(1);
		});

		it('allows SW failure report after 10 second window', async () => {
			const handler = (service as unknown as { swMessageHandler: (e: MessageEvent) => void }).swMessageHandler;
			const event = new MessageEvent('message', {
				data: { type: 'REVALIDATION_FAILED', payload: { url: '/api/res2' } },
			});

			handler(event);
			await vi.advanceTimersByTimeAsync(0);
			expect(saveReportToOutbox).toHaveBeenCalledTimes(1);

			vi.advanceTimersByTime(10_001);

			handler(event);
			await vi.advanceTimersByTimeAsync(0);
			expect(saveReportToOutbox).toHaveBeenCalledTimes(2);
		});

		it('ignores non-REVALIDATION_FAILED messages', async () => {
			const handler = (service as unknown as { swMessageHandler: (e: MessageEvent) => void }).swMessageHandler;

			handler(new MessageEvent('message', {
				data: { type: 'SOME_OTHER_TYPE', payload: {} },
			}));

			await vi.advanceTimersByTimeAsync(0);
			expect(saveReportToOutbox).not.toHaveBeenCalled();
		});
	});
	// #endregion
});
// #endregion
