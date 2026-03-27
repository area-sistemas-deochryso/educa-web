// #region Imports
import { Injectable, inject, signal, DestroyRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '@core/services/auth/auth.service';
import { UserPermisosService } from '@core/services/permisos/user-permisos.service';
import { SwService } from '@core/services/sw';
import { StorageService } from '@core/services/storage';
import { SessionRefreshService } from './session-refresh.service';
import { SessionCoordinatorService } from './session-coordinator.service';
import { logger, Duration } from '@core/helpers';
// #endregion

// #region Constants

/** Debounce user activity tracking (30s). */
const ACTIVITY_DEBOUNCE = Duration.seconds(30);

/** Without activity for 5 min = idle. */
const IDLE_THRESHOLD = Duration.minutes(5);

/** DOM events that count as user activity. */
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = ['mousedown', 'keydown', 'touchstart', 'scroll'];

// #endregion

// #region Implementation

/**
 * Keeps the session alive while the user is actively using the intranet.
 *
 * Orchestrates:
 * - **Activity tracking** (mouse, keyboard, touch, scroll) with idle detection.
 * - **SessionRefreshService** for token lifecycle and offline recovery.
 * - **SessionCoordinatorService** for cross-tab logout/login coordination.
 */
@Injectable({ providedIn: 'root' })
export class SessionActivityService {
	// #region Dependencies
	private refreshService = inject(SessionRefreshService);
	private coordinator = inject(SessionCoordinatorService);
	private authService = inject(AuthService);
	private userPermisosService = inject(UserPermisosService);
	private swService = inject(SwService);
	private storage = inject(StorageService);
	private router = inject(Router);
	private platformId = inject(PLATFORM_ID);
	private destroyRef = inject(DestroyRef);
	// #endregion

	// #region State
	private readonly _lastActivity = signal(Date.now());
	private readonly _isTabVisible = signal(true);
	private readonly _isRunning = signal(false);
	private _isLoggingOut = false;

	private activityDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private boundActivityHandler: (() => void) | null = null;
	private boundVisibilityHandler: (() => void) | null = null;
	// #endregion

	// #region Constructor — reactive listeners

	constructor() {
		// React to session expiry from the refresh service
		this.refreshService.sessionExpired$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.forceLogout());

		// React to cross-tab logout/login messages
		this.coordinator.message$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((msg) => {
				if (!this._isRunning()) return;

				if (msg.type === 'logout' && !this._isLoggingOut) {
					logger.warn('[SessionActivity] Another tab logged out — following');
					this.forceLogout();
				} else if (msg.type === 'login') {
					const currentUser = this.authService.currentUser;
					if (currentUser && (currentUser.entityId !== msg.entityId || currentUser.rol !== msg.rol)) {
						logger.warn('[SessionActivity] Otro tab inició sesión con un usuario diferente — cerrando sesión');
						this.forceLogout();
					}
				}
			});
	}

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

		this.registerActivityListeners();
		this.registerVisibilityListener();
		this.coordinator.setup();
		this.refreshService.start(
			() => this.isUserActive(),
			() => this._isTabVisible(),
		);

		logger.log('[SessionActivity] Started — verifying session with server');
	}

	/**
	 * Stop tracking and clean up all listeners/timers.
	 */
	stop(): void {
		if (!this._isRunning()) return;

		this.refreshService.stop();
		this.removeActivityListeners();
		this.removeVisibilityListener();
		this.coordinator.teardown();

		if (this.activityDebounceTimer) {
			clearTimeout(this.activityDebounceTimer);
			this.activityDebounceTimer = null;
		}

		this._isRunning.set(false);
		logger.log('[SessionActivity] Stopped');
	}

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

		this.coordinator.broadcast({ type: 'logout' });
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
		}, ACTIVITY_DEBOUNCE.ms);
	}

	private isUserActive(): boolean {
		return (Date.now() - this._lastActivity()) < IDLE_THRESHOLD.ms;
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
			this.refreshService.checkTokenValidity();
		}
	}

	// #endregion
}
// #endregion
