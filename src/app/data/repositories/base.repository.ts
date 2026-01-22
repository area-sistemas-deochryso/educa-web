import { inject } from '@angular/core';
import { Observable, catchError, of, map } from 'rxjs';
import { BaseHttpService } from '@core/services/http';
import { logger } from '@core/helpers';

export interface QueryParams {
	[key: string]: string | number | boolean | undefined;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
}

/**
 * Repositorio base con operaciones CRUD genericas
 * T = Tipo de entidad
 * C = Tipo para crear (opcional, por defecto Partial<T>)
 * U = Tipo para actualizar (opcional, por defecto Partial<T>)
 */
export abstract class BaseRepository<T, C = Partial<T>, U = Partial<T>> {
	protected httpService = inject(BaseHttpService);

	protected abstract endpoint: string;
	protected abstract entityName: string;

	/**
	 * Obtener todos los registros
	 */
	getAll(params?: QueryParams): Observable<T[]> {
		return this.httpService['get']<T[]>(
			this.endpoint,
			params
				? { params: this.httpService['buildParams'](params as Record<string, unknown>) }
				: undefined,
		).pipe(
			catchError((error) => {
				logger.error(`[${this.entityName}Repository] Error getAll:`, error);
				return of([]);
			}),
		);
	}

	/**
	 * Obtener un registro por ID
	 */
	getById(id: number | string): Observable<T | null> {
		return this.httpService['get']<T>(`${this.endpoint}/${id}`).pipe(
			catchError((error) => {
				logger.error(`[${this.entityName}Repository] Error getById:`, error);
				return of(null);
			}),
		);
	}

	/**
	 * Crear un nuevo registro
	 */
	create(data: C): Observable<T | null> {
		return this.httpService['post']<T>(this.endpoint, data).pipe(
			catchError((error) => {
				logger.error(`[${this.entityName}Repository] Error create:`, error);
				throw error; // Propagar para manejo en UI
			}),
		);
	}

	/**
	 * Actualizar un registro
	 */
	update(id: number | string, data: U): Observable<T | null> {
		return this.httpService['put']<T>(`${this.endpoint}/${id}`, data).pipe(
			catchError((error) => {
				logger.error(`[${this.entityName}Repository] Error update:`, error);
				throw error;
			}),
		);
	}

	/**
	 * Actualizar parcialmente un registro
	 */
	patch(id: number | string, data: Partial<U>): Observable<T | null> {
		return this.httpService['patch']<T>(`${this.endpoint}/${id}`, data).pipe(
			catchError((error) => {
				logger.error(`[${this.entityName}Repository] Error patch:`, error);
				throw error;
			}),
		);
	}

	/**
	 * Eliminar un registro
	 */
	delete(id: number | string): Observable<boolean> {
		return this.httpService['delete']<void>(`${this.endpoint}/${id}`).pipe(
			map(() => true),
			catchError((error) => {
				logger.error(`[${this.entityName}Repository] Error delete:`, error);
				return of(false);
			}),
		);
	}

	/**
	 * Obtener con paginacion
	 */
	getPaginated(
		page: number,
		pageSize: number,
		params?: QueryParams,
	): Observable<PaginatedResponse<T>> {
		const queryParams = {
			...params,
			page: page.toString(),
			pageSize: pageSize.toString(),
		};

		return this.httpService['get']<PaginatedResponse<T>>(this.endpoint, {
			params: this.httpService['buildParams'](queryParams as Record<string, unknown>),
		}).pipe(
			catchError((error) => {
				logger.error(`[${this.entityName}Repository] Error getPaginated:`, error);
				return of({ data: [], total: 0, page, pageSize });
			}),
		);
	}
}
