// #region Imports
import { Observable, catchError, map, of } from 'rxjs';

import { BaseRepository } from '../base/base.repository';
import { CreateUserDto, UpdateUserDto, User } from '@data/models';
import { Injectable } from '@angular/core';
import { logger } from '@core/helpers';

// #endregion
// #region Implementation
@Injectable({
	providedIn: 'root',
})
export class UserRepository extends BaseRepository<User, CreateUserDto, UpdateUserDto> {
	// * Repository wrapper for user endpoints.
	protected endpoint = '/api/Users';
	protected entityName = 'User';

	/**
	 * Buscar usuario por DNI
	 */
	getByDni(dni: string): Observable<User | null> {
		return this.httpService['get']<User>(`${this.endpoint}/dni/${dni}`).pipe(
			catchError((error) => {
				logger.error('[UserRepository] getByDni error:', error);
				return of(null);
			}),
		);
	}

	/**
	 * Cambiar contrasena
	 */
	changePassword(userId: number, oldPassword: string, newPassword: string): Observable<boolean> {
		return this.httpService['post']<void>(`${this.endpoint}/${userId}/change-password`, {
			oldPassword,
			newPassword,
		}).pipe(
			map(() => true),
			catchError((error) => {
				logger.error('[UserRepository] changePassword error:', error);
				throw error;
			}),
		);
	}

	/**
	 * Activar/Desactivar usuario
	 */
	toggleActive(userId: number): Observable<User | null> {
		return this.httpService['patch']<User>(`${this.endpoint}/${userId}/toggle-active`, {}).pipe(
			catchError((error) => {
				logger.error('[UserRepository] toggleActive error:', error);
				return of(null);
			}),
		);
	}
}
// #endregion
