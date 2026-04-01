// #region Imports
import { AuthUser, CambiarContrasenaRequest, LoginResponse, StoredSession, UserRole } from './auth.models';
import { EMPTY, Observable, catchError, map, of, tap, timeout } from 'rxjs';
import { Injectable, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

/** Must match CHANNEL_NAME in session-activity.service.ts */
const SESSION_CHANNEL_NAME = 'educa-session';

import { AuthApiService } from './auth-api.service';
import { StorageService } from '../storage';
import { logger, Duration } from '@core/helpers';
import { UI_AUTH_MESSAGES } from '@app/shared/constants';

// #endregion
// #region Implementation

/**
 * Authentication facade that orchestrates API, storage, and reactive state.
 * Token is managed server-side via HttpOnly cookie — never visible to JS.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
	private readonly MAX_LOGIN_ATTEMPTS = 3;
	private api = inject(AuthApiService);
	private storage = inject(StorageService);

	// #region Reactive state
	private readonly _isAuthenticated = signal(this.storage.hasUserInfo());
	private readonly _currentUser = signal<AuthUser | null>(this.storage.getUser());
	private readonly _loginAttempts = signal(0);

	// Signal reads (synchronous)
	get isAuthenticated(): boolean { return this._isAuthenticated(); }
	get currentUser(): AuthUser | null { return this._currentUser(); }
	get loginAttempts(): number { return this._loginAttempts(); }
	get remainingAttempts(): number { return this.MAX_LOGIN_ATTEMPTS - this._loginAttempts(); }
	get isBlocked(): boolean { return this._loginAttempts() >= this.MAX_LOGIN_ATTEMPTS; }

	// Observable bridges for consumers that use toSignal(authService.isAuthenticated$)
	isAuthenticated$ = toObservable(this._isAuthenticated);
	currentUser$ = toObservable(this._currentUser);
	loginAttempts$ = toObservable(this._loginAttempts);
	// #endregion

	// #region Commands

	/**
	 * Log in. The server sets the HttpOnly cookie — we never see the token.
	 */
	login(
		dni: string,
		password: string,
		rol: UserRole,
		rememberMe = false,
	): Observable<LoginResponse> {
		if (this.isBlocked) {
			return of({
				success: false,
				token: '',
				rol: rol,
				nombreCompleto: '',
				entityId: 0,
				sedeId: 0,
				mensaje: UI_AUTH_MESSAGES.loginTooManyAttempts,
			});
		}

		return this.api.login({ dni, contraseña: password, rol, rememberMe }).pipe(
			tap((response) => {
				if (response.success) {
					this.handleSuccessfulLogin(response, rememberMe);
				} else {
					this.incrementAttempts();
				}
			}),
			catchError((error) => {
				this.incrementAttempts();
				return of({
					success: false,
					token: '',
					rol: rol,
					nombreCompleto: '',
					entityId: 0,
					sedeId: 0,
					mensaje: error.error?.mensaje || UI_AUTH_MESSAGES.loginError,
				});
			}),
		);
	}

	/**
	 * Fetch the authenticated user profile and update local storage.
	 * The HttpOnly cookie is sent automatically by the browser.
	 */
	getProfile() {
		return this.api.getProfile().pipe(
			tap((profile) => {
				const currentUser = this.currentUser;
				if (currentUser && profile) {
					const updatedUser: AuthUser = {
						...currentUser,
						dni: profile.dni,
						nombreCompleto: profile.nombreCompleto,
					};
					this._currentUser.set(updatedUser);
					this.storage.setUser(updatedUser);
				}
			}),
		);
	}

	/**
	 * Verify the current session by requesting the profile.
	 * The HttpOnly cookie is sent automatically.
	 */
	verifyToken(): Observable<boolean> {
		return this.getProfile().pipe(map((profile) => !!profile));
	}

	/**
	 * Log out: tell the server to clear the cookie, then clean up local state.
	 * The API call has a 5s timeout — if it fails, cookies may persist but
	 * local state is always cleaned immediately.
	 */
	logout(): void {
		this.api.logout().pipe(
			timeout(Duration.seconds(5).ms),
			catchError((err) => {
				logger.warn('[Auth] Logout API failed — HttpOnly cookies may persist until expiry', err);
				return EMPTY;
			}),
		).subscribe();

		// Clean local state immediately (don't wait for API)
		this.storage.clearPermisos();
		this.storage.clearAuth();

		this._isAuthenticated.set(false);
		this._currentUser.set(null);
		this.resetAttempts();
	}

	resetAttempts(): void {
		this._loginAttempts.set(0);
	}

	/**
	 * Change the authenticated user's own password.
	 */
	cambiarContrasena(dto: CambiarContrasenaRequest): Observable<{ mensaje: string }> {
		return this.api.cambiarContrasena(dto);
	}

	// #endregion

	// #region Sessions (Multi-User)

	/**
	 * Get stored sessions for the current device (for user switcher UI).
	 */
	getSessions(): Observable<StoredSession[]> {
		return this.api.getSessions();
	}

	/**
	 * Switch to a different stored session.
	 * The server sets the new auth cookie.
	 */
	switchSession(sessionId: string): Observable<StoredSession> {
		return this.api.switchSession(sessionId).pipe(
			tap((session) => {
				const user: AuthUser = {
					rol: session.rol as UserRole,
					nombreCompleto: session.nombreCompleto,
					entityId: session.entityId,
					sedeId: session.sedeId,
				};
				this._currentUser.set(user);
				this.storage.setUser(user);
				this._isAuthenticated.set(true);
				this.broadcastLoginEvent(user);
			}),
		);
	}

	/**
	 * Remove a stored session from the server.
	 */
	removeSession(sessionId: string): Observable<void> {
		return this.api.deleteSession(sessionId);
	}

	// #endregion

	// #region Deprecated (disabled — remove after cookie migration verified)

	// [COOKIE_MIGRATION] Token-based session methods disabled.
	// Sessions are now managed server-side via /api/Auth/sessions.
	// verifyAllStoredTokens(): Observable<VerifyTokenResponse[]> { ... }
	// verifyTokenForAutofill(): Observable<VerifyTokenResponse | null> { ... }

	// #endregion

	// #region Private helpers

	/**
	 * Persist user info (without token) and update reactive state.
	 */
	private handleSuccessfulLogin(response: LoginResponse, rememberMe = false): void {
		const user: AuthUser = {
			rol: response.rol,
			nombreCompleto: response.nombreCompleto,
			entityId: response.entityId,
			sedeId: response.sedeId,
		};

		// Only store user info — token is in HttpOnly cookie
		this.storage.setUser(user, rememberMe);

		this._isAuthenticated.set(true);
		this._currentUser.set(user);
		this.resetAttempts();

		// Notify other tabs: the cookie changed. Tabs with a different active user
		// will force logout so their stale menu/permisos don't cause 403 errors.
		this.broadcastLoginEvent(user);

		// Fire-and-forget: despierta el pool de conexiones de Azure SQL para que
		// las primeras paginas de datos no sufran el cold start de ~12s.
		this.api.warmup().subscribe();
	}

	/**
	 * Broadcast a login event to other tabs/windows sharing the same origin.
	 * Uses a short-lived BroadcastChannel so AuthService has no persistent channel.
	 */
	private broadcastLoginEvent(user: AuthUser): void {
		try {
			const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
			channel.postMessage({ type: 'login', entityId: user.entityId, rol: user.rol });
			channel.close();
		} catch {
			// BroadcastChannel not available (old Safari, SSR) — safe to ignore
		}
	}

	private incrementAttempts(): void {
		this._loginAttempts.set(this.loginAttempts + 1);
	}

	// #endregion
}
// #endregion
