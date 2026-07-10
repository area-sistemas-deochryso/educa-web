// #region Imports
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';

import { SessionRefreshService } from './session-refresh.service';
import { SessionCoordinatorService, type SessionMessage } from './session-coordinator.service';
// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: AuthApiService is internal to auth/
import { AuthApiService } from '@core/services/auth/auth-api.service';
import { SwService } from '@core/services/sw';
// #endregion

// #region Constants (mirror the service's private values)
const TOKEN_LIFETIME_MS = 3_600_000;    // 1 hour
const REFRESH_TIMER_MS = 3_000_000;     // 50 min
const RECHECK_INTERVAL_MS = 60_000;     // 60s
// #endregion

// #region Mocks
function createAuthApiMock() {
	return {
		refresh: vi.fn().mockReturnValue(of({})),
		getProfile: vi.fn().mockReturnValue(of({ id: 1 })),
	};
}

function createSwMock() {
	return {
		_online: true,
		get isOnline() { return this._online; },
		isOnline$: new Subject<boolean>(),
		invalidateCacheByPattern: vi.fn().mockResolvedValue(undefined),
	};
}

function createCoordinatorMock() {
	return {
		message$: new Subject<SessionMessage>(),
		broadcast: vi.fn(),
	};
}
// #endregion

// #region Tests
describe('SessionRefreshService', () => {
	let service: SessionRefreshService;
	let authApi: ReturnType<typeof createAuthApiMock>;
	let sw: ReturnType<typeof createSwMock>;
	let coordinator: ReturnType<typeof createCoordinatorMock>;

	const isActive = () => true;
	const isVisible = () => true;

	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		authApi = createAuthApiMock();
		sw = createSwMock();
		coordinator = createCoordinatorMock();

		TestBed.configureTestingModule({
			providers: [
				SessionRefreshService,
				{ provide: AuthApiService, useValue: authApi },
				{ provide: SwService, useValue: sw },
				{ provide: SessionCoordinatorService, useValue: coordinator },
			],
		});

		service = TestBed.inject(SessionRefreshService);
	});

	afterEach(() => {
		service.stop();
		vi.useRealTimers();
	});

	// #region start + verifySession
	describe('start + verifySession', () => {
		it('schedules refresh when online and profile is valid', () => {
			service.start(isActive, isVisible);

			expect(authApi.getProfile).toHaveBeenCalledOnce();
			expect(authApi.refresh).not.toHaveBeenCalled();
		});

		it('attempts refresh when profile returns null', () => {
			authApi.getProfile.mockReturnValue(of(null));

			service.start(isActive, isVisible);

			expect(authApi.getProfile).toHaveBeenCalledOnce();
			expect(authApi.refresh).toHaveBeenCalledOnce();
		});

		it('defers verification when offline at startup', () => {
			sw._online = false;

			service.start(isActive, isVisible);

			expect(authApi.getProfile).not.toHaveBeenCalled();
			expect(authApi.refresh).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region doRefresh
	describe('doRefresh (timer fires while active)', () => {
		it('broadcasts refresh-done and reschedules on success', () => {
			service.start(isActive, isVisible);

			vi.advanceTimersByTime(REFRESH_TIMER_MS);

			expect(authApi.refresh).toHaveBeenCalledOnce();
			expect(coordinator.broadcast).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'refresh-done' }),
			);
		});

		it('emits sessionExpired$ when refresh fails and online', () => {
			authApi.refresh.mockReturnValue(throwError(() => new Error('401')));
			let expired = false;
			service.sessionExpired$.subscribe(() => { expired = true; });

			service.start(isActive, isVisible);

			// Profile OK → schedules timer → timer fires → doRefresh fails
			// But getProfile succeeds, so timer is scheduled normally
			vi.advanceTimersByTime(REFRESH_TIMER_MS);

			expect(expired).toBe(true);
		});

		it('waits for reconnection when refresh fails and offline', () => {
			let expired = false;
			service.sessionExpired$.subscribe(() => { expired = true; });

			service.start(isActive, isVisible);

			// After initial verify, go offline and make refresh fail
			sw._online = false;
			authApi.refresh.mockReturnValue(throwError(() => new Error('network')));

			vi.advanceTimersByTime(REFRESH_TIMER_MS);

			// Should NOT emit expired — should wait for reconnection
			expect(expired).toBe(false);
		});
	});
	// #endregion

	// #region Idle gating
	describe('onRefreshTimerFired (idle gating)', () => {
		it('rechecks after 60s when tab is hidden', () => {
			let hidden = false;
			service.start(() => true, () => !hidden);

			hidden = true;
			vi.advanceTimersByTime(REFRESH_TIMER_MS);

			// Should NOT call refresh because tab is hidden
			expect(authApi.refresh).not.toHaveBeenCalled();

			// Becomes visible again
			hidden = false;
			vi.advanceTimersByTime(RECHECK_INTERVAL_MS);

			// Now should refresh
			expect(authApi.refresh).toHaveBeenCalledOnce();
		});

		it('rechecks after 60s when user is idle', () => {
			let active = true;
			service.start(() => active, isVisible);

			active = false;
			vi.advanceTimersByTime(REFRESH_TIMER_MS);

			expect(authApi.refresh).not.toHaveBeenCalled();

			active = true;
			vi.advanceTimersByTime(RECHECK_INTERVAL_MS);

			expect(authApi.refresh).toHaveBeenCalledOnce();
		});

		it('emits sessionExpired$ when token is already expired at timer fire', () => {
			let expired = false;
			service.sessionExpired$.subscribe(() => { expired = true; });

			// Refresh succeeds at 50min, setting lastRefreshTime to 50min mark
			service.start(isActive, isVisible);
			vi.advanceTimersByTime(REFRESH_TIMER_MS);
			expect(expired).toBe(false);

			// Now make refresh fail for the next timer
			authApi.refresh.mockReturnValue(throwError(() => new Error('fail')));
			// Advance another 50min to next timer (total 100min, last refresh at 50min = 50min elapsed)
			// Still under TOKEN_LIFETIME (60min), so it attempts refresh → fails → expired
			// Actually need to get past TOKEN_LIFETIME from last refresh (50min mark).
			// Advance 60min+1ms from 50min mark = advance 60min+1ms
			vi.advanceTimersByTime(TOKEN_LIFETIME_MS + 1);

			expect(expired).toBe(true);
		});

		it('skips refresh when another tab refreshed recently', () => {
			service.start(isActive, isVisible);

			// Simulate another tab refreshing just before our timer fires
			vi.advanceTimersByTime(REFRESH_TIMER_MS - 10_000);
			coordinator.message$.next({ type: 'refresh-done', timestamp: Date.now() });

			// Our timer fires, but recent cross-tab refresh → skip
			vi.advanceTimersByTime(10_000);

			// Only the initial getProfile should have been called, no refresh
			expect(authApi.refresh).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region Cross-tab coordination
	describe('cross-tab coordination', () => {
		it('reschedules on refresh-done message from another tab', () => {
			service.start(isActive, isVisible);

			coordinator.message$.next({ type: 'refresh-done', timestamp: Date.now() });

			// Verify it didn't trigger a refresh call — just rescheduled
			expect(authApi.refresh).not.toHaveBeenCalled();
		});

		it('ignores messages when service is not running', () => {
			// Don't start the service
			coordinator.message$.next({ type: 'refresh-done', timestamp: Date.now() });

			expect(authApi.refresh).not.toHaveBeenCalled();
			expect(authApi.getProfile).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region stop
	describe('stop', () => {
		it('prevents timer from firing after stop', () => {
			service.start(isActive, isVisible);
			service.stop();

			vi.advanceTimersByTime(REFRESH_TIMER_MS);

			// Only the initial getProfile from start(), no refresh from timer
			expect(authApi.refresh).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region checkTokenValidity
	describe('checkTokenValidity', () => {
		it('attempts refresh when token is expired', () => {
			// Start with hidden tab so timers don't auto-refresh
			service.start(() => true, () => false);
			authApi.refresh.mockClear();

			// Advance past TOKEN_LIFETIME — tab is hidden so timer just rechecks
			vi.advanceTimersByTime(TOKEN_LIFETIME_MS + 1);

			// Now call checkTokenValidity externally (e.g., tab becomes visible)
			authApi.refresh.mockReturnValue(of({}));
			service.checkTokenValidity();

			expect(authApi.refresh).toHaveBeenCalled();
		});

		it('does nothing when token is still valid', () => {
			service.start(isActive, isVisible);
			authApi.refresh.mockClear();

			service.checkTokenValidity();

			expect(authApi.refresh).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region isTokenExpired
	describe('isTokenExpired', () => {
		it('returns false within TOKEN_LIFETIME', () => {
			// Start with hidden tab to prevent timer-triggered refresh
			service.start(() => true, () => false);

			vi.advanceTimersByTime(TOKEN_LIFETIME_MS - 60_000);

			expect(service.isTokenExpired()).toBe(false);
		});

		it('returns true after TOKEN_LIFETIME', () => {
			// Start with hidden tab to prevent timer-triggered refresh
			service.start(() => true, () => false);

			vi.advanceTimersByTime(TOKEN_LIFETIME_MS + 1);

			expect(service.isTokenExpired()).toBe(true);
		});
	});
	// #endregion

	// #region waitForReconnection
	describe('offline recovery', () => {
		it('re-verifies session when coming back online', () => {
			sw._online = false;
			service.start(isActive, isVisible);

			expect(authApi.getProfile).not.toHaveBeenCalled();

			// Come back online
			sw._online = true;
			sw.isOnline$.next(true);

			expect(authApi.getProfile).toHaveBeenCalledOnce();
		});

		it('does not stack reconnection listeners on repeated offline events', () => {
			service.start(isActive, isVisible);

			// Go offline, make refresh fail
			sw._online = false;
			authApi.refresh.mockReturnValue(throwError(() => new Error('offline')));

			vi.advanceTimersByTime(REFRESH_TIMER_MS);

			// Trigger another timer that also goes to waitForReconnection
			authApi.getProfile.mockClear();
			// Come online → should only re-verify once (no stacked listeners)
			sw._online = true;
			sw.isOnline$.next(true);

			expect(authApi.getProfile).toHaveBeenCalledTimes(1);
		});
	});
	// #endregion
});
// #endregion
