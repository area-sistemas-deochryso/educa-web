// #region Imports
import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

import { AuthApiService } from '@core/services/auth/auth-api.service';
import { AuthService } from '@core/services/auth/auth.service';
import { UserPermisosService } from '@core/services/permisos/user-permisos.service';
import { SwService } from '@core/services/sw';
import { StorageService } from '@core/services/storage';
import { TimerManager } from '@core/services/destroy/destroy.service';
import { logger } from '@core/helpers';
// #endregion

// #region Constants

/** Must match CookieConfig.AccessTokenExpiry on the backend (1 hour). */
const TOKEN_LIFETIME_MS = 60 * 60 * 1000;

/** Refresh 10 min before expiry. */
const REFRESH_BEFORE_MS = 10 * 60 * 1000;

/** Timer fires at TOKEN_LIFETIME - REFRESH_BEFORE (50 min). */
const REFRESH_TIMER_MS = TOKEN_LIFETIME_MS - REFRESH_BEFORE_MS;

/** Debounce user activity tracking (30s). */
const ACTIVITY_DEBOUNCE_MS = 30 * 1000;

/** Without activity for 5 min = idle. */
const IDLE_THRESHOLD_MS = 5 * 60 * 1000;

/** Re-check when user is idle (60s). */
const RECHECK_INTERVAL_MS = 60 * 1000;

/** DOM events that count as user activity. */
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = ['mousedown', 'keydown', 'touchstart', 'scroll'];

// #endregion

// #region Implementation

/**
 * Keeps the session alive while the user is actively using the intranet.
 *
 * - Proactively refreshes the token 10 min before expiry (only if active + tab visible).
 * - Lets the token expire naturally when the user is idle or the tab is hidden.
 * - On tab-return, checks if the token likely expired while away and redirects to login.
 */
@Injectable({ providedIn: 'root' })
export class SessionActivityService {
	// #region Dependencies
	private authApi = inject(AuthApiService);
	private authService = inject(AuthService);
	private userPermisosService = inject(UserPermisosService);
	private swService = inject(SwService);
	private storage = inject(StorageService);
	private router = inject(Router);
	private platformId = inject(PLATFORM_ID);
	private timerManager = new TimerManager();
	// #endregion

	// #region State
	private readonly _lastActivity = signal(Date.now());
	private readonly _lastRefreshTime = signal(Date.now());
	private readonly _isTabVisible = signal(true);
	private readonly _isRunning = signal(false);
	private _isLoggingOut = false;

	private activityDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private boundActivityHandler: (() => void) | null = null;
	private boundVisibilityHandler: (() => void) | null = null;
	// #endregion

	// #region Public API

	/**
	 * Start tracking activity and scheduling token refresh.
	 * Called from IntranetLayoutComponent.ngOnInit().
	 */
	start(): void {
		if (this._isRunning() || !isPlatformBrowser(this.platformId)) return;

		this._isRunning.set(true);
		this._lastActivity.set(Date.now());
		this._lastRefreshTime.set(Date.now());

		this.registerActivityListeners();
		this.registerVisibilityListener();
		this.scheduleRefresh();

		logger.log('[SessionActivity] Started — token refresh at', REFRESH_TIMER_MS / 60_000, 'min');
	}

	/**
	 * Stop tracking and clean up all listeners/timers.
	 */
	stop(): void {
		if (!this._isRunning()) return;

		this.removeActivityListeners();
		this.removeVisibilityListener();
		this.timerManager.clearAll();

		if (this.activityDebounceTimer) {
			clearTimeout(this.activityDebounceTimer);
			this.activityDebounceTimer = null;
		}

		this._isRunning.set(false);
		logger.log('[SessionActivity] Stopped');
	}

	// #endregion

	// #region Activity tracking

	private registerActivityListeners(): void {
		this.boundActivityHandler = () => this.onUserActivity();

		for (const event of ACTIVITY_EVENTS) {
			document.addEventListener(event, this.boundActivityHandler, { passive: true });
		}
	}

	private removeActivityListeners(): void {
		if (!this.boundActivityHandler) return;

		for (const event of ACTIVITY_EVENTS) {
			document.removeEventListener(event, this.boundActivityHandler);
		}
		this.boundActivityHandler = null;
	}

	private onUserActivity(): void {
		// Debounce: only update timestamp once per ACTIVITY_DEBOUNCE_MS
		if (this.activityDebounceTimer) return;

		this._lastActivity.set(Date.now());

		this.activityDebounceTimer = setTimeout(() => {
			this.activityDebounceTimer = null;
		}, ACTIVITY_DEBOUNCE_MS);
	}

	// #endregion

	// #region Visibility tracking

	private registerVisibilityListener(): void {
		this.boundVisibilityHandler = () => this.onVisibilityChange();
		document.addEventListener('visibilitychange', this.boundVisibilityHandler);
	}

	private removeVisibilityListener(): void {
		if (!this.boundVisibilityHandler) return;
		document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
		this.boundVisibilityHandler = null;
	}

	private onVisibilityChange(): void {
		const visible = !document.hidden;
		this._isTabVisible.set(visible);

		if (visible) {
			this.checkTokenValidity();
		}
	}

	// #endregion

	// #region Refresh scheduling

	private scheduleRefresh(): void {
		this.timerManager.clearAll();

		this.timerManager.setTimeout(() => this.onRefreshTimerFired(), REFRESH_TIMER_MS);
	}

	private scheduleRecheck(): void {
		this.timerManager.clearAll();

		this.timerManager.setTimeout(() => this.onRefreshTimerFired(), RECHECK_INTERVAL_MS);
	}

	private onRefreshTimerFired(): void {
		if (!this._isRunning()) return;

		// Token already expired — redirect to login
		if (this.isTokenExpired()) {
			this.handleSessionExpired();
			return;
		}

		const isActive = this.isUserActive();
		const isVisible = this._isTabVisible();

		if (isVisible || isActive) {
			this.doRefresh();
		} else {
			// Tab hidden AND idle — re-check later
			this.scheduleRecheck();
		}
	}

	private doRefresh(): void {
		this.authApi.refresh().subscribe({
			next: () => {
				this._lastRefreshTime.set(Date.now());
				this.scheduleRefresh();
				logger.log('[SessionActivity] Token refreshed — next in', REFRESH_TIMER_MS / 60_000, 'min');
			},
			error: () => {
				logger.warn('[SessionActivity] Refresh failed — session expired');
				this.handleSessionExpired();
			},
		});
	}

	// #endregion

	// #region Validation helpers

	private isUserActive(): boolean {
		return (Date.now() - this._lastActivity()) < IDLE_THRESHOLD_MS;
	}

	private isTokenExpired(): boolean {
		return (Date.now() - this._lastRefreshTime()) > TOKEN_LIFETIME_MS;
	}

	/**
	 * When the tab becomes visible again, check if the token expired while away.
	 */
	private checkTokenValidity(): void {
		if (this.isTokenExpired()) {
			this.handleSessionExpired();
		}
	}

	private handleSessionExpired(): void {
		this.forceLogout();
	}

	// #endregion

	// #region Force logout

	/**
	 * Complete session teardown: stop tracking, revoke permisos, clear all
	 * caches and auth state, then redirect to login.
	 *
	 * Safe to call multiple times (e.g. concurrent 401s) — only the first
	 * call executes, subsequent calls are no-ops.
	 */
	forceLogout(): void {
		if (this._isLoggingOut) return;
		this._isLoggingOut = true;

		this.stop();
		this.userPermisosService.clear();
		this.swService.clearCache();
		this.storage.clearAuth();
		this.authService.logout();

		logger.warn('[SessionActivity] Session revoked — redirecting to login');
		this.router.navigate(['/intranet/login']).then(() => {
			this._isLoggingOut = false;
		});
	}

	// #endregion
}
// #endregion
