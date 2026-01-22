import { Injectable } from '@angular/core';
import { Observable, catchError, of, map } from 'rxjs';
import { BaseRepository } from './base.repository';
import { logger } from '@core/helpers';

export interface User {
	id: number;
	dni: string;
	nombreCompleto: string;
	email?: string;
	telefono?: string;
	rol: string;
	activo: boolean;
	fechaCreacion?: string;
}

export interface CreateUserDto {
	dni: string;
	nombreCompleto: string;
	email?: string;
	telefono?: string;
	rol: string;
	password: string;
}

export interface UpdateUserDto {
	nombreCompleto?: string;
	email?: string;
	telefono?: string;
	activo?: boolean;
}

@Injectable({
	providedIn: 'root',
})
export class UserRepository extends BaseRepository<User, CreateUserDto, UpdateUserDto> {
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
