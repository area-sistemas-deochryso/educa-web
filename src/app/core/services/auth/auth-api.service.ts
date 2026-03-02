import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '@env/environment';
import { LoginRequest, LoginResponse, StoredSession, UserProfile, VerifyTokenResponse } from './auth.models';

/**
 * Thin HTTP gateway for authentication endpoints.
 * No state, no storage, no side effects.
 * Cookies are sent automatically by the browser (withCredentials).
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
	private http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/Auth`;
	/** Suppresses the global error toast for optional calls with local catchError. */
	private readonly silentHeaders = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });

	// #region Auth

	/**
	 * Log in. The server sets an HttpOnly cookie with the JWT.
	 */
	login(request: LoginRequest): Observable<LoginResponse> {
		return this.http.post<LoginResponse>(`${this.apiUrl}/login`, request);
	}

	/**
	 * Log out. The server clears the HttpOnly cookie.
	 */
	logout(): Observable<void> {
		return this.http.post<void>(`${this.apiUrl}/logout`, {});
	}

	/**
	 * Fetch the current user profile.
	 * Auth cookie is sent automatically by the browser.
	 */
	getProfile(): Observable<UserProfile | null> {
		return this.http
			.get<UserProfile>(`${this.apiUrl}/perfil`, { headers: this.silentHeaders })
			.pipe(catchError(() => of(null)));
	}

	/**
	 * Verify a token and return its metadata.
	 * @deprecated Will be removed after full cookie migration.
	 */
	verifyToken(token: string): Observable<VerifyTokenResponse | null> {
		return this.http
			.post<VerifyTokenResponse>(`${this.apiUrl}/verificar`, JSON.stringify(token), {
				headers: { 'Content-Type': 'application/json' },
			})
			.pipe(catchError(() => of(null)));
	}

	// #endregion

	// #region Sessions (Multi-User)

	/**
	 * Get all stored sessions for the current device.
	 */
	getSessions(): Observable<StoredSession[]> {
		return this.http
			.get<StoredSession[]>(`${this.apiUrl}/sessions`, { headers: this.silentHeaders })
			.pipe(catchError(() => of([])));
	}

	/**
	 * Switch to a different stored session.
	 * The server sets the new auth cookie.
	 */
	switchSession(sessionId: string): Observable<StoredSession> {
		return this.http.post<StoredSession>(
			`${this.apiUrl}/switch-session/${sessionId}`,
			{},
		);
	}

	/**
	 * Remove a stored session from the server.
	 */
	deleteSession(sessionId: string): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/sessions/${sessionId}`);
	}

	// #endregion
}
