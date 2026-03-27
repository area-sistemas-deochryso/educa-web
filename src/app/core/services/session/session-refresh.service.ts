// #region Imports
import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { filter, Subject, take, takeUntil } from 'rxjs';

import { AuthApiService } from '@core/services/auth/auth-api.service';
import { SwService } from '@core/services/sw';
import { TimerManager } from '@core/services/destroy/destroy.service';
import { SessionCoordinatorService } from './session-coordinator.service';
import { logger, Duration } from '@core/helpers';
// #endregion

// #region Constants

/** Must match CookieConfig.AccessTokenExpiry on the backend (1 hour). */
const TOKEN_LIFETIME = Duration.hours(1);

/** Refresh 10 min before expiry. */
const REFRESH_BEFORE = Duration.minutes(10);

/** Timer fires at TOKEN_LIFETIME - REFRESH_BEFORE (50 min). */
const REFRESH_TIMER = Duration.milliseconds(TOKEN_LIFETIME.ms - REFRESH_BEFORE.ms);

/** Re-check when user is idle (60s). */
const RECHECK_INTERVAL = Duration.seconds(60);

/** Cooldown after another tab refreshed — skip our own refresh (2 min). */
const CROSS_TAB_REFRESH_COOLDOWN = Duration.minutes(2);

// #endregion

// #region Implementation

/**
 * Handles token refresh lifecycle:
 *
 * - Schedules proactive refresh 10 min before expiry.
 * - Verifies the session on startup via profile endpoint.
 * - Handles offline → online reconnection.
 * - Coordinates with other tabs to avoid duplicate refreshes.
 *
 * Emits `sessionExpired$` when the session cannot be recovered.
 */
@Injectable({ providedIn: 'root' })
export class SessionRefreshService {
	// #region Dependencies
	private authApi = inject(AuthApiService);
	private swService = inject(SwService);
	private coordinator = inject(SessionCoordinatorService);
	private destroyRef = inject(DestroyRef);
	private timerManager = new TimerManager();
	// #endregion

	// #region State
	private readonly _lastRefreshTime = signal(Date.now());
	private readonly _isRunning = signal(false);
	private readonly cancelReconnect$ = new Subject<void>();

	/** Emitted when the session is irrecoverably expired. */
	private readonly _sessionExpired$ = new Subject<void>();
	readonly sessionExpired$ = this._sessionExpired$.asObservable();
	// #endregion

	// #region Constructor — cross-tab listener

	constructor() {
		this.coordinator.message$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((msg) => {
				if (!this._isRunning()) return;

				if (msg.type === 'refresh-done') {
					// Another tab refreshed — update our timer so we don't duplicate
					this._lastRefreshTime.set(msg.timestamp);
					this.scheduleRefresh();
					logger.log('[SessionRefresh] Another tab refreshed — rescheduled');
				}
			});
	}

	// #endregion

	// #region Public API

	/**
	 * Begin refresh scheduling. Verifies the session with the server first.
	 * @param isUserActive Callback to check if the user is active (for idle gating).
	 * @param isTabVisible Callback to check if the tab is visible.
	 */
	start(isUserActive: () => boolean, isTabVisible: () => boolean): void {
		this._isUserActive = isUserActive;
		this._isTabVisible = isTabVisible;
		this._isRunning.set(true);

		this.verifySession();
	}

	/**
	 * Stop all timers and cancel pending reconnection listeners.
	 */
	stop(): void {
		this.cancelReconnect$.next();
		this.timerManager.clearAll();
		this._isRunning.set(false);
	}

	/**
	 * Check if the token has expired (e.g. after tab returns from being hidden).
	 * If expired, attempts refresh or emits sessionExpired$.
	 */
	checkTokenValidity(): void {
		if (this.isTokenExpired()) {
			logger.log('[SessionRefresh] Token expired while tab was hidden — attempting refresh');
			this.attemptRefreshOrLogout();
		}
	}

	/** Whether the token has exceeded its lifetime since last refresh. */
	isTokenExpired(): boolean {
		return (Date.now() - this._lastRefreshTime()) > TOKEN_LIFETIME.ms;
	}

	// #endregion

	// #region Activity callbacks
	private _isUserActive: () => boolean = () => true;
	private _isTabVisible: () => boolean = () => true;
	// #endregion

	// #region Refresh scheduling

	private scheduleRefresh(): void {
		this.timerManager.clearAll();
		this.timerManager.setTimeout(() => this.onRefreshTimerFired(), REFRESH_TIMER.ms);
	}

	private scheduleRecheck(): void {
		this.timerManager.clearAll();
		this.timerManager.setTimeout(() => this.onRefreshTimerFired(), RECHECK_INTERVAL.ms);
	}

	private onRefreshTimerFired(): void {
		if (!this._isRunning()) return;

		// Token already expired — session is dead
		if (this.isTokenExpired()) {
			this._sessionExpired$.next();
			return;
		}

		// Another tab refreshed recently — skip and reschedule
		if (this.wasRecentlyRefreshedByOtherTab()) {
			this.scheduleRefresh();
			return;
		}

		const isActive = this._isUserActive();
		const isVisible = this._isTabVisible();

		if (isVisible && isActive) {
			this.doRefresh();
		} else {
			// Tab hidden OR idle — re-check later (don't keep session alive without real usage)
			this.scheduleRecheck();
		}
	}

	private doRefresh(): void {
		this.authApi.refresh().subscribe({
			next: () => {
				const now = Date.now();
				this._lastRefreshTime.set(now);
				this.coordinator.broadcast({ type: 'refresh-done', timestamp: now });
				this.scheduleRefresh();
				logger.log('[SessionRefresh] Token refreshed — next in', REFRESH_TIMER.minutes, 'min');
			},
			error: () => {
				if (!this.swService.isOnline) {
					logger.warn('[SessionRefresh] Refresh failed — offline, waiting for reconnection');
					this.waitForReconnection();
					return;
				}
				logger.warn('[SessionRefresh] Refresh failed — session expired');
				this._sessionExpired$.next();
			},
		});
	}

	// #endregion

	// #region Session verification

	/**
	 * Verify the session is still valid by calling the profile endpoint.
	 * getProfile() uses X-Skip-Error-Toast + catchError(→ null), so 401 is handled
	 * gracefully without triggering the error interceptor's forceLogout.
	 */
	private verifySession(): void {
		// If offline at startup, skip server verification and wait for reconnection
		if (!this.swService.isOnline) {
			logger.warn('[SessionRefresh] Offline at startup — deferring session verification');
			this.waitForReconnection();
			return;
		}

		this.authApi.getProfile().subscribe({
			next: (profile) => {
				if (profile) {
					// Token is valid — mark refresh time so the timer schedules correctly
					this._lastRefreshTime.set(Date.now());
					this.scheduleRefresh();
					logger.log('[SessionRefresh] Session verified — refresh in', REFRESH_TIMER.minutes, 'min');
				} else {
					this.attemptRefreshOrLogout();
				}
			},
			error: () => {
				this.attemptRefreshOrLogout();
			},
		});
	}

	/**
	 * Try a token refresh. If it succeeds, the cookie was still valid and we
	 * can resume normal scheduling. If it fails, the session is truly dead.
	 */
	private attemptRefreshOrLogout(): void {
		this.authApi.refresh().subscribe({
			next: () => {
				this._lastRefreshTime.set(Date.now());
				this.scheduleRefresh();
				logger.log('[SessionRefresh] Session recovered via refresh');
			},
			error: () => {
				if (!this.swService.isOnline) {
					logger.warn('[SessionRefresh] Refresh failed — offline, waiting for reconnection');
					this.waitForReconnection();
					return;
				}
				logger.warn('[SessionRefresh] Session verification failed — session expired');
				this._sessionExpired$.next();
			},
		});
	}

	// #endregion

	// #region Offline recovery

	/**
	 * When offline, subscribe to isOnline$ and re-verify the session
	 * once connectivity is restored instead of forcing a false logout.
	 */
	private waitForReconnection(): void {
		// Cancel any previous reconnection listener to prevent stacking
		this.cancelReconnect$.next();

		this.swService.isOnline$
			.pipe(
				filter((online) => online),
				take(1),
				takeUntil(this.cancelReconnect$),
			)
			.subscribe(() => {
				if (!this._isRunning()) return;
				logger.log('[SessionRefresh] Back online — re-verifying session');
				this.verifySession();
			});
	}

	// #endregion

	// #region Helpers

	/** Returns true if another tab refreshed recently enough that we can skip. */
	private wasRecentlyRefreshedByOtherTab(): boolean {
		return (Date.now() - this._lastRefreshTime()) < CROSS_TAB_REFRESH_COOLDOWN.ms;
	}

	// #endregion
}
// #endregion
