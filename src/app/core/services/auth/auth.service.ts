// #region Imports
import { AuthUser, CambiarContrasenaRequest, LoginResponse, StoredSession, UserRole } from './auth.models';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { Injectable, inject } from '@angular/core';

/** Must match CHANNEL_NAME in session-activity.service.ts */
const SESSION_CHANNEL_NAME = 'educa-session';

import { AuthApiService } from './auth-api.service';
import { StorageService } from '../storage';
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
	// Subjects bootstrap from storage so UI can render immediately on app load.
	private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.storage.hasUserInfo());
	private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.storage.getUser());
	private loginAttemptsSubject = new BehaviorSubject<number>(0);

	isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();
	currentUser$: Observable<AuthUser | null> = this.currentUserSubject.asObservable();
	loginAttempts$: Observable<number> = this.loginAttemptsSubject.asObservable();

	get isAuthenticated(): boolean {
		return this.isAuthenticatedSubject.value;
	}

	get currentUser(): AuthUser | null {
		return this.currentUserSubject.value;
	}

	get loginAttempts(): number {
		return this.loginAttemptsSubject.value;
	}

	get remainingAttempts(): number {
		return this.MAX_LOGIN_ATTEMPTS - this.loginAttempts;
	}

	get isBlocked(): boolean {
		return this.loginAttempts >= this.MAX_LOGIN_ATTEMPTS;
	}
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
					this.handleSuccessfulLogin(response);
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
					this.currentUserSubject.next(updatedUser);
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
	 */
	logout(): void {
		// Fire-and-forget server logout (clears HttpOnly cookie)
		this.api.logout().subscribe();

		// Clean local state immediately
		this.storage.clearPermisos();
		this.storage.clearAuth();

		this.isAuthenticatedSubject.next(false);
		this.currentUserSubject.next(null);
		this.resetAttempts();
	}

	resetAttempts(): void {
		this.loginAttemptsSubject.next(0);
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
				this.currentUserSubject.next(user);
				this.storage.setUser(user);
				this.isAuthenticatedSubject.next(true);
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
	private handleSuccessfulLogin(response: LoginResponse): void {
		const user: AuthUser = {
			rol: response.rol,
			nombreCompleto: response.nombreCompleto,
			entityId: response.entityId,
			sedeId: response.sedeId,
		};

		// Only store user info — token is in HttpOnly cookie
		this.storage.setUser(user);

		this.isAuthenticatedSubject.next(true);
		this.currentUserSubject.next(user);
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
		this.loginAttemptsSubject.next(this.loginAttempts + 1);
	}

	// #endregion
}
// #endregion
