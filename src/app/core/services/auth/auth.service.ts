import {
	AuthUser,
	LoginRequest,
	LoginResponse,
	UserProfile,
	UserRole,
	VerifyTokenResponse,
} from './auth.models';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { StorageService } from '../storage';
import { environment } from '@env/environment';
import { UI_AUTH_MESSAGES } from '@app/shared/constants';

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
	 * @param rememberMe Si es true, la sesión persiste al cerrar el navegador
	 */
	login(
		dni: string,
		password: string,
		rol: UserRole,
		rememberMe = false,
	): Observable<LoginResponse> {
		if (this.isBlocked) {
			return of({
				token: '',
				rol: rol,
				nombreCompleto: '',
				entityId: 0,
				sedeId: 0,
				mensaje: UI_AUTH_MESSAGES.loginTooManyAttempts,
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
					this.handleSuccessfulLogin(response, rememberMe);
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
					mensaje: error.error?.mensaje || UI_AUTH_MESSAGES.loginError,
				});
			}),
		);
	}

	private handleSuccessfulLogin(response: LoginResponse, rememberMe: boolean): void {
		const user: AuthUser = {
			token: response.token,
			rol: response.rol,
			nombreCompleto: response.nombreCompleto,
			entityId: response.entityId,
			sedeId: response.sedeId,
		};

		// Guardar según la preferencia de "recordar sesión"
		// Pasar nombreCompleto y rol para generar la clave de sesión única
		this.storage.setToken(response.token, rememberMe, response.nombreCompleto, response.rol);
		this.storage.setUser(user, rememberMe);

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
		// Limpiar permisos ANTES de clearAuth, porque clearAuth borra el sessionKey
		this.storage.clearPermisos();
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

	/**
	 * Verifica un token guardado para autocompletar el formulario de login
	 * Usa el endpoint POST /api/Auth/verificar
	 */
	verifyTokenForAutofill(): Observable<VerifyTokenResponse | null> {
		const rememberToken = this.storage.getRememberToken();
		if (!rememberToken) {
			return of(null);
		}

		return this.http
			.post<VerifyTokenResponse>(`${this.apiUrl}/verificar`, JSON.stringify(rememberToken), {
				headers: { 'Content-Type': 'application/json' },
			})
			.pipe(
				catchError(() => {
					// Si el token es inválido, limpiarlo
					this.storage.clearRememberToken();
					return of(null);
				}),
			);
	}

	/**
	 * Verifica los tokens persistentes guardados para autocompletado
	 * Retorna un array con la información de cada usuario verificado
	 */
	verifyAllStoredTokens(): Observable<VerifyTokenResponse[]> {
		const persistentTokens = this.storage.getAllPersistentTokens();

		if (persistentTokens.length === 0) {
			return of([]);
		}

		const verifyRequests = persistentTokens.map(({ token }) =>
			this.http
				.post<VerifyTokenResponse>(`${this.apiUrl}/verificar`, JSON.stringify(token), {
					headers: { 'Content-Type': 'application/json' },
				})
				.pipe(catchError(() => of(null))),
		);

		return forkJoin(verifyRequests).pipe(
			map((responses) => responses.filter((r): r is VerifyTokenResponse => r !== null)),
		);
	}
}
