import { BehaviorSubject, Observable } from 'rxjs';

import { Injectable } from '@angular/core';

@Injectable({
	providedIn: 'root',
})
export class AuthService {
	private readonly MAX_LOGIN_ATTEMPTS = 3;
	private readonly AUTH_KEY = 'intranet_authenticated';

	private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.checkStoredAuth());
	private loginAttemptsSubject = new BehaviorSubject<number>(0);

	isAuthenticated$: Observable<boolean> = this.isAuthenticatedSubject.asObservable();
	loginAttempts$: Observable<number> = this.loginAttemptsSubject.asObservable();

	private checkStoredAuth(): boolean {
		return (
			localStorage.getItem(this.AUTH_KEY) === 'true' ||
			sessionStorage.getItem(this.AUTH_KEY) === 'true'
		);
	}

	get isAuthenticated(): boolean {
		return this.isAuthenticatedSubject.value;
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

	login(username: string, password: string, rememberMe: boolean = false): boolean {
		if (this.isBlocked) {
			return false;
		}

		// Validar credenciales (en producción esto sería una llamada al backend)
		const isValid = this.validateCredentials(username, password);

		if (isValid) {
			this.isAuthenticatedSubject.next(true);
			if (rememberMe) {
				localStorage.setItem(this.AUTH_KEY, 'true');
			} else {
				sessionStorage.setItem(this.AUTH_KEY, 'true');
			}
			this.resetAttempts();
			return true;
		}

		this.incrementAttempts();
		return false;
	}

	logout(): void {
		this.isAuthenticatedSubject.next(false);
		localStorage.removeItem(this.AUTH_KEY);
		sessionStorage.removeItem(this.AUTH_KEY);
		this.resetAttempts();
	}

	private validateCredentials(username: string, password: string): boolean {
		// Credenciales de prueba - en producción esto sería validado por el backend
		// Comparación en mayúsculas
		return username.toUpperCase() === 'ADMIN' && password.toUpperCase() === 'ABC';
	}

	private incrementAttempts(): void {
		this.loginAttemptsSubject.next(this.loginAttempts + 1);
	}

	resetAttempts(): void {
		this.loginAttemptsSubject.next(0);
	}
}
