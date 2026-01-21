import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '@env/environment';

import { AuthUser, LoginRequest, LoginResponse, UserProfile, UserRole } from './auth.models';
import { StorageService } from '../storage';

@Injectable({
	providedIn: 'root',
})
export class AuthService {
	private readonly MAX_LOGIN_ATTEMPTS = 3;
	private http = inject(HttpClient);
	private storage = inject(StorageService);

	private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
	private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
	private loginAttemptsSubject = new BehaviorSubject<number>(0);

	isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();
	currentUser$: Observable<AuthUser | null> = this.currentUserSubject.asObservable();
	loginAttempts$: Observable<number> = this.loginAttemptsSubject.asObservable();

	private readonly apiUrl = `${environment.apiUrl}/api/Auth`;

	private hasValidToken(): boolean {
		return this.storage.hasToken();
	}

	private getStoredUser(): AuthUser | null {
		return this.storage.getUser();
	}

	get isAuthenticated(): boolean {
		return this.isAuthenticatedSubject.value;
	}

	get currentUser(): AuthUser | null {
		return this.currentUserSubject.value;
	}

	get token(): string | null {
		return this.storage.getToken();
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
			tap((response) => {
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
			}),
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
		this.storage.setToken(response.token);
		this.storage.setUser(user);

		this.isAuthenticatedSubject.next(true);
		this.currentUserSubject.next(user);
		this.resetAttempts();
	}

	/**
	 * Obtener perfil del usuario autenticado usando GET /api/Auth/perfil
	 */
	getProfile(): Observable<UserProfile | null> {
		return this.http.get<UserProfile>(`${this.apiUrl}/perfil`).pipe(
			tap((profile) => {
				// Actualizar usuario con datos del perfil
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
			catchError(() => of(null)),
		);
	}

	/**
	 * Verificar si el token es válido obteniendo el perfil
	 */
	verifyToken(): Observable<boolean> {
		if (!this.token) {
			return of(false);
		}

		return this.getProfile().pipe(map((profile) => !!profile));
	}

	logout(): void {
		this.storage.clearAuth();

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
