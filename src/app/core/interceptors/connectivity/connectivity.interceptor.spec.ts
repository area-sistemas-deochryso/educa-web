// * Tests for connectivity interceptor — validates consecutive-failure counting,
// * the 30s sliding window, and success/failure signaling to ConnectivityService.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { connectivityInterceptor, resetConnectivityInterceptorState } from './connectivity.interceptor';
import { ConnectivityService } from '@core/services/connectivity';
// #endregion

// #region Tests
describe('connectivityInterceptor', () => {
	let httpClient: HttpClient;
	let httpMock: HttpTestingController;
	let connectivityMock: Partial<ConnectivityService>;

	beforeEach(() => {
		vi.useFakeTimers();
		resetConnectivityInterceptorState();

		connectivityMock = {
			reportForcedOffline: vi.fn(),
			reportSuccess: vi.fn(),
		};

		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(withInterceptors([connectivityInterceptor])),
				provideHttpClientTesting(),
				{ provide: ConnectivityService, useValue: connectivityMock },
			],
		});

		httpClient = TestBed.inject(HttpClient);
		httpMock = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		httpMock.verify();
		vi.useRealTimers();
	});

	function failWith(status: number): void {
		httpClient.get('/api/test').subscribe({ error: () => {} });
		httpMock.expectOne('/api/test').flush('Error', { status, statusText: 'Error' });
	}

	function succeed(): void {
		httpClient.get('/api/test').subscribe({ error: () => {} });
		httpMock.expectOne('/api/test').flush({ ok: true });
	}

	// #region Pass-through for non-/api/ URLs
	it('should not touch requests outside /api/', () => {
		httpClient.get('/assets/config.json').subscribe();
		httpMock.expectOne('/assets/config.json').flush({});

		expect(connectivityMock.reportSuccess).not.toHaveBeenCalled();
	});
	// #endregion

	// #region Forced offline
	it('should call reportForcedOffline after 3 consecutive network errors (status 0) within the window', () => {
		failWith(0);
		failWith(0);
		expect(connectivityMock.reportForcedOffline).not.toHaveBeenCalled();

		failWith(0);
		expect(connectivityMock.reportForcedOffline).toHaveBeenCalledTimes(1);
	});

	it('should call reportForcedOffline after 3 consecutive 5xx errors within the window', () => {
		failWith(500);
		failWith(503);
		failWith(502);

		expect(connectivityMock.reportForcedOffline).toHaveBeenCalledTimes(1);
	});
	// #endregion

	// #region Reset on success
	it('should reset the counter on a success between failures — no trigger on the 3rd consecutive-looking failure', () => {
		failWith(0);
		failWith(0);
		succeed();

		failWith(0);
		expect(connectivityMock.reportForcedOffline).not.toHaveBeenCalled();
	});
	// #endregion

	// #region 4xx is not a connectivity failure
	it('should NOT count a 4xx as a connectivity failure and should reset the counter', () => {
		failWith(0);
		failWith(0);
		failWith(400);

		failWith(0);
		failWith(0);
		expect(connectivityMock.reportForcedOffline).not.toHaveBeenCalled();

		expect(connectivityMock.reportSuccess).toHaveBeenCalled();
	});
	// #endregion

	// #region Success reporting
	it('should call reportSuccess on a successful response', () => {
		succeed();

		expect(connectivityMock.reportSuccess).toHaveBeenCalledTimes(1);
	});
	// #endregion

	// #region Sliding window expiry
	it('should not accumulate failures outside the 30s window', () => {
		failWith(0);
		vi.advanceTimersByTime(15_000);
		failWith(0);
		vi.advanceTimersByTime(20_000); // first failure now > 30s old, drops out of the window
		failWith(0);

		expect(connectivityMock.reportForcedOffline).not.toHaveBeenCalled();
	});
	// #endregion
});
// #endregion
