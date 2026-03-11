import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, of } from 'rxjs';

import { environment } from '@env/environment';
import { CambiarContrasenaRequest, LoginRequest, LoginResponse, StoredSession, UserProfile, VerifyTokenResponse } from './auth.models';

/**
 * Thin HTTP gateway for authentication endpoints.
 * No state, no storage, no side effects.
 * Cookies are sent automatically by the browser (withCredentials).
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
	private http = inject(HttpClient);
	private readonly apiUrl = `${environment.apiUrl}/api/Auth`;
	private readonly sistemaUrl = `${environment.apiUrl}/api/sistema`;
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
	 * Refresh the access token using the HttpOnly refresh cookie.
	 * Returns the new session context on success.
	 */
	refresh(): Observable<{ rol: string; nombreCompleto: string; entityId: number; sedeId: number }> {
		return this.http.post<{ rol: string; nombreCompleto: string; entityId: number; sedeId: number }>(
			`${this.apiUrl}/refresh`,
			{},
		);
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
	 * Change the authenticated user's own password.
	 */
	cambiarContrasena(dto: CambiarContrasenaRequest): Observable<{ mensaje: string }> {
		return this.http.put<{ mensaje: string }>(`${this.apiUrl}/perfil/contrasena`, dto);
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

	// #region Warmup

	/**
	 * Dispara una query minima contra Azure SQL para despertar el pool de conexiones.
	 * Llamar fire-and-forget tras login exitoso. Nunca falla hacia el caller.
	 */
	warmup(): Observable<void> {
		return this.http
			.get<void>(`${this.sistemaUrl}/warmup`, { headers: this.silentHeaders })
			.pipe(catchError(() => EMPTY));
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
	 * Silent: errors are handled locally by quickLogin(), not by the global interceptor.
	 */
	switchSession(sessionId: string): Observable<StoredSession> {
		return this.http.post<StoredSession>(
			`${this.apiUrl}/switch-session/${sessionId}`,
			{},
			{ headers: this.silentHeaders },
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
