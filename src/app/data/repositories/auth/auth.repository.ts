import { LoginRequest, LoginResponse, UserProfile, VerifyTokenResponse } from '@core/services/auth';
import { Observable, catchError, of } from 'rxjs';

import { BaseRepository } from '../base/base.repository';
import { Injectable } from '@angular/core';
import { logger } from '@core/helpers';
import { UI_AUTH_MESSAGES } from '@app/shared/constants';

@Injectable({
	providedIn: 'root',
})
export class AuthRepository extends BaseRepository<UserProfile> {
	protected endpoint = '/api/Auth';
	protected entityName = 'Auth';

	/**
	 * Iniciar sesion
	 */
	login(credentials: LoginRequest): Observable<LoginResponse> {
		return this.httpService['post']<LoginResponse>(`${this.endpoint}/login`, credentials).pipe(
			catchError((error) => {
				logger.error('[AuthRepository] Login error:', error);
				return of({
					token: '',
					rol: credentials.rol,
					nombreCompleto: '',
					entityId: 0,
					sedeId: 0,
					mensaje: error.error?.mensaje || UI_AUTH_MESSAGES.loginError,
				});
			}),
		);
	}

	/**
	 * Obtener perfil del usuario autenticado
	 */
	getProfile(): Observable<UserProfile | null> {
		return this.httpService['get']<UserProfile>(`${this.endpoint}/perfil`).pipe(
			catchError((error) => {
				logger.error('[AuthRepository] Get profile error:', error);
				return of(null);
			}),
		);
	}

	/**
	 * Verificar token para autofill
	 */
	verifyToken(token: string): Observable<VerifyTokenResponse | null> {
		return this.httpService['post']<VerifyTokenResponse>(
			`${this.endpoint}/verificar`,
			JSON.stringify(token),
			{ headers: { 'Content-Type': 'application/json' } },
		).pipe(
			catchError((error) => {
				logger.error('[AuthRepository] Verify token error:', error);
				return of(null);
			}),
		);
	}
}
