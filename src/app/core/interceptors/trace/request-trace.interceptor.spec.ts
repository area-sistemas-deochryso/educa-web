// * Tests for the request trace interceptor — correlation headers sent to the backend.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SessionCorrelationService } from '@core/services/trace';
import { requestTraceInterceptor } from './request-trace.interceptor';

// #endregion
// #region Implementation
describe('requestTraceInterceptor', () => {
	let httpClient: HttpClient;
	let httpMock: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([requestTraceInterceptor])),
				provideHttpClientTesting(),
			],
		});

		httpClient = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
	});

	it('sends the browser session id in X-Session-Id on every request', () => {
		const session = TestBed.inject(SessionCorrelationService);

		httpClient.get('/api/a').subscribe();
		httpClient.get('/api/b').subscribe();

		const first = httpMock.expectOne('/api/a');
		const second = httpMock.expectOne('/api/b');
		expect(first.request.headers.get('X-Session-Id')).toBe(session.id);
		expect(second.request.headers.get('X-Session-Id')).toBe(session.id);
		first.flush({});
		second.flush({});
	});

	it('keeps a fresh X-Request-Id per request while the session id stays the same', () => {
		httpClient.get('/api/a').subscribe();
		httpClient.get('/api/b').subscribe();

		const first = httpMock.expectOne('/api/a');
		const second = httpMock.expectOne('/api/b');
		expect(first.request.headers.get('X-Request-Id')).not.toBe(second.request.headers.get('X-Request-Id'));
		expect(first.request.headers.get('X-Session-Id')).toBe(second.request.headers.get('X-Session-Id'));
		first.flush({});
		second.flush({});
	});

	it('sends a session id the backend accepts (charset [A-Za-z0-9_-], max 50)', () => {
		httpClient.get('/api/a').subscribe();

		const req = httpMock.expectOne('/api/a');
		expect(req.request.headers.get('X-Session-Id')).toMatch(/^[A-Za-z0-9_-]{1,50}$/);
		req.flush({});
	});
});
// #endregion
