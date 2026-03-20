// #region Imports
import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

import { filter, take } from 'rxjs';

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

/** Cooldown after another tab refreshed — skip our own refresh (2 min). */
const CROSS_TAB_REFRESH_COOLDOWN_MS = 2 * 60 * 1000;

/** BroadcastChannel name for multi-tab coordination. */
const CHANNEL_NAME = 'educa-session';

/** DOM events that count as user activity. */
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = ['mousedown', 'keydown', 'touchstart', 'scroll'];

type SessionMessage =
	| { type: 'refresh-done'; timestamp: number }
	| { type: 'logout' }
	| { type: 'login'; entityId: number; rol: string };

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
	private channel: BroadcastChannel | null = null;
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
		// Don't set _lastRefreshTime here — the actual token age is unknown.
		// verifySession() will set it after confirming the token is valid.

		this.registerActivityListeners();
		this.registerVisibilityListener();
		this.setupBroadcastChannel();

		// Verify session with server before trusting local storage.
		// If the cookie expired while the browser was closed, redirect to login immediately.
		this.verifySession();

		logger.log('[SessionActivity] Started — verifying session with server');
	}

	/**
	 * Stop tracking and clean up all listeners/timers.
	 */
	stop(): void {
		if (!this._isRunning()) return;

		this.removeActivityListeners();
		this.removeVisibilityListener();
		this.teardownBroadcastChannel();
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

	// #region Multi-tab coordination (BroadcastChannel)

	private setupBroadcastChannel(): void {
		try {
			this.channel = new BroadcastChannel(CHANNEL_NAME);
			this.channel.onmessage = (event: MessageEvent<SessionMessage>) => {
				this.onChannelMessage(event.data);
			};
		} catch {
			// BroadcastChannel not supported (e.g. older Safari) — degrade gracefully
			logger.warn('[SessionActivity] BroadcastChannel not available — multi-tab coordination disabled');
		}
	}

	private teardownBroadcastChannel(): void {
		this.channel?.close();
		this.channel = null;
	}

	private broadcastMessage(msg: SessionMessage): void {
		try {
			this.channel?.postMessage(msg);
		} catch {
			// Channel closed or errored — ignore
		}
	}

	private onChannelMessage(msg: SessionMessage): void {
		if (msg.type === 'refresh-done') {
			// Another tab refreshed — update our timer so we don't duplicate
			this._lastRefreshTime.set(msg.timestamp);
			this.scheduleRefresh();
			logger.log('[SessionActivity] Another tab refreshed — rescheduled');
		} else if (msg.type === 'logout') {
			// Another tab logged out — follow suit
			if (!this._isLoggingOut) {
				logger.warn('[SessionActivity] Another tab logged out — following');
				this.forceLogout();
			}
		} else if (msg.type === 'login') {
			// Another tab logged in — if the user is different, the cookie changed and our
			// session is now stale. Force logout so the menu/permisos get rebuilt on re-login.
			const currentUser = this.authService.currentUser;
			if (currentUser && (currentUser.entityId !== msg.entityId || currentUser.rol !== msg.rol)) {
				logger.warn('[SessionActivity] Otro tab inició sesión con un usuario diferente — cerrando sesión');
				this.forceLogout();
			}
		}
	}

	/** Returns true if another tab refreshed recently enough that we can skip. */
	private wasRecentlyRefreshedByOtherTab(): boolean {
		return (Date.now() - this._lastRefreshTime()) < CROSS_TAB_REFRESH_COOLDOWN_MS;
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

		// Another tab refreshed recently — skip and reschedule
		if (this.wasRecentlyRefreshedByOtherTab()) {
			this.scheduleRefresh();
			return;
		}

		const isActive = this.isUserActive();
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
				this.broadcastMessage({ type: 'refresh-done', timestamp: now });
				this.scheduleRefresh();
				logger.log('[SessionActivity] Token refreshed — next in', REFRESH_TIMER_MS / 60_000, 'min');
			},
			error: () => {
				if (!this.swService.isOnline) {
					logger.warn('[SessionActivity] Refresh failed — offline, waiting for reconnection');
					this.waitForReconnection();
					return;
				}
				logger.warn('[SessionActivity] Refresh failed — session expired');
				this.handleSessionExpired();
			},
		});
	}

	/**
	 * Verify the session is still valid by calling the profile endpoint.
	 * getProfile() uses X-Skip-Error-Toast + catchError(→ null), so 401 is handled
	 * gracefully without triggering the error interceptor's forceLogout.
	 */
	private verifySession(): void {
		// If offline at startup, skip server verification and wait for reconnection
		if (!this.swService.isOnline) {
			logger.warn('[SessionActivity] Offline at startup — deferring session verification');
			this.waitForReconnection();
			return;
		}

		this.authApi.getProfile().subscribe({
			next: (profile) => {
				if (profile) {
					// Token is valid — mark refresh time so the timer schedules correctly
					this._lastRefreshTime.set(Date.now());
					this.scheduleRefresh();
					logger.log('[SessionActivity] Session verified — refresh in', REFRESH_TIMER_MS / 60_000, 'min');
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
				logger.log('[SessionActivity] Session recovered via refresh');
			},
			error: () => {
				if (!this.swService.isOnline) {
					logger.warn('[SessionActivity] Refresh failed — offline, waiting for reconnection');
					this.waitForReconnection();
					return;
				}
				logger.warn('[SessionActivity] Session verification failed — redirecting to login');
				this.forceLogout();
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
	 * Instead of immediate logout, attempt refresh — the refresh cookie may still be valid.
	 */
	private checkTokenValidity(): void {
		if (this.isTokenExpired()) {
			logger.log('[SessionActivity] Token expired while tab was hidden — attempting refresh');
			this.attemptRefreshOrLogout();
		}
	}

	private handleSessionExpired(): void {
		this.forceLogout();
	}

	/**
	 * When offline, subscribe to isOnline$ and re-verify the session
	 * once connectivity is restored instead of forcing a false logout.
	 */
	private waitForReconnection(): void {
		this.swService.isOnline$
			.pipe(
				filter((online) => online),
				take(1),
			)
			.subscribe(() => {
				if (!this._isRunning()) return;
				logger.log('[SessionActivity] Back online — re-verifying session');
				this.verifySession();
			});
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

		this.broadcastMessage({ type: 'logout' });
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
