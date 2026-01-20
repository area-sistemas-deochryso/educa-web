import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '@app/environment';

import { AuthUser, LoginRequest, LoginResponse, UserProfile, UserRole } from './auth.models';

// Constantes fijas para el storage
const TOKEN_KEY = 'educa_token';
const USER_KEY = 'educa_user';

@Injectable({
	providedIn: 'root',
})
export class AuthService {
	private readonly MAX_LOGIN_ATTEMPTS = 3;

	private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
	private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
	private loginAttemptsSubject = new BehaviorSubject<number>(0);

	isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();
	currentUser$: Observable<AuthUser | null> = this.currentUserSubject.asObservable();
	loginAttempts$: Observable<number> = this.loginAttemptsSubject.asObservable();

	private readonly apiUrl = `${environment.apiUrl}/api/Auth`;

	constructor(private http: HttpClient) {}

	private hasValidToken(): boolean {
		return !!localStorage.getItem(TOKEN_KEY);
	}

	private getStoredUser(): AuthUser | null {
		const userJson = localStorage.getItem(USER_KEY);
		if (userJson) {
			try {
				return JSON.parse(userJson);
			} catch {
				return null;
			}
		}
		return null;
	}

	get isAuthenticated(): boolean {
		return this.isAuthenticatedSubject.value;
	}

	get currentUser(): AuthUser | null {
		return this.currentUserSubject.value;
	}

	get token(): string | null {
		return localStorage.getItem(TOKEN_KEY);
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

	/**
	 * Login usando el endpoint POST /api/Auth/login
	 */
	login(dni: string, password: string, rol: UserRole): Observable<LoginResponse> {
		if (this.isBlocked) {
			return of({
				token: '',
				rol: rol,
				nombreCompleto: '',
				entityId: 0,
				sedeId: 0,
				mensaje: 'Demasiados intentos fallidos. Intente más tarde.',
			});
		}

		const request: LoginRequest = {
			dni: dni,
			contraseña: password,
			rol: rol,
		};

		return this.http.post<LoginResponse>(`${this.apiUrl}/login`, request).pipe(
			tap(response => {
				if (response.token) {
					this.handleSuccessfulLogin(response);
				} else {
					this.incrementAttempts();
				}
			}),
			catchError((error: HttpErrorResponse) => {
				this.incrementAttempts();
				return of({
					token: '',
					rol: rol,
					nombreCompleto: '',
					entityId: 0,
					sedeId: 0,
					mensaje: error.error?.mensaje || 'Error al iniciar sesión',
				});
			})
		);
	}

	private handleSuccessfulLogin(response: LoginResponse): void {
		const user: AuthUser = {
			token: response.token,
			rol: response.rol,
			nombreCompleto: response.nombreCompleto,
			entityId: response.entityId,
			sedeId: response.sedeId,
		};

		// Siempre guardar en localStorage
		localStorage.setItem(TOKEN_KEY, response.token);
		localStorage.setItem(USER_KEY, JSON.stringify(user));

		this.isAuthenticatedSubject.next(true);
		this.currentUserSubject.next(user);
		this.resetAttempts();
	}

	/**
	 * Obtener perfil del usuario autenticado usando GET /api/Auth/perfil
	 */
	getProfile(): Observable<UserProfile | null> {
		return this.http.get<UserProfile>(`${this.apiUrl}/perfil`).pipe(
			tap(profile => {
				// Actualizar usuario con datos del perfil
				const currentUser = this.currentUser;
				if (currentUser && profile) {
					const updatedUser: AuthUser = {
						...currentUser,
						dni: profile.dni,
						nombreCompleto: profile.nombreCompleto,
					};
					this.currentUserSubject.next(updatedUser);
					localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
				}
			}),
			catchError(() => of(null))
		);
	}

	/**
	 * Verificar si el token es válido obteniendo el perfil
	 */
	verifyToken(): Observable<boolean> {
		if (!this.token) {
			return of(false);
		}

		return this.getProfile().pipe(map(profile => !!profile));
	}

	logout(): void {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);

		this.isAuthenticatedSubject.next(false);
		this.currentUserSubject.next(null);
		this.resetAttempts();
	}

	private incrementAttempts(): void {
		this.loginAttemptsSubject.next(this.loginAttempts + 1);
	}

	resetAttempts(): void {
		this.loginAttemptsSubject.next(0);
	}
}
