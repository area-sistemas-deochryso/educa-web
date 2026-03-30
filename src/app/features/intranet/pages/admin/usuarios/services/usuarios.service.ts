// #region Imports
import {
	ActualizarUsuarioRequest,
	CrearUsuarioRequest,
	CredencialExport,
	ImportarEstudianteItem,
	ImportarEstudiantesResponse,
	UsuarioDetalle,
	UsuarioLista,
	UsuariosEstadisticas,
} from '../models';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { ApiResponse } from '@shared/models';
import { HttpClient } from '@angular/common/http';
import { PaginatedResponse } from '@data/repositories/base/base.repository';
import { environment } from '@env/environment';

// #endregion
// #region Implementation

/**
 * Usuarios API gateway for list, details, and CRUD.
 */
@Injectable({
	providedIn: 'root',
})
export class UsuariosService {
	// CRUD wrapper for usuarios endpoints.
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/usuarios`;
	private http = inject(HttpClient);

	/**
	 * List users with optional role and state filters.
	 */
	listarUsuarios(rol?: string, estado?: boolean): Observable<UsuarioLista[]> {
		const params: Record<string, string> = {};
		if (rol) params['rol'] = rol;
		if (estado !== undefined) params['estado'] = estado.toString();

		return this.http
			.get<UsuarioLista[]>(`${this.apiUrl}/listar`, { params })
			.pipe(catchError(() => of([])));
	}

	/**
	 * List users with pagination and optional filters.
	 */
	listarUsuariosPaginado(
		page: number,
		pageSize: number,
		rol?: string,
		estado?: boolean,
		search?: string,
		salonId?: number,
	): Observable<PaginatedResponse<UsuarioLista>> {
		const params: Record<string, string> = {
			page: page.toString(),
			pageSize: pageSize.toString(),
		};
		if (rol) params['rol'] = rol;
		if (estado !== undefined) params['estado'] = estado.toString();
		if (search) params['search'] = search;
		if (salonId) params['salonId'] = salonId.toString();

		return this.http
			.get<PaginatedResponse<UsuarioLista>>(`${this.apiUrl}/listar`, { params })
			.pipe(
				catchError(() =>
					of({
						data: [],
						total: 0,
						page,
						pageSize,
						totalPages: 0,
						hasNextPage: false,
						hasPreviousPage: false,
					}),
				),
			);
	}

	/**
	 * Get a user by role and id.
	 */
	obtenerUsuario(rol: string, id: number): Observable<UsuarioDetalle | null> {
		return this.http
			.get<UsuarioDetalle>(`${this.apiUrl}/${encodeURIComponent(rol)}/${id}`)
			.pipe(catchError(() => of(null)));
	}

	/**
	 * Create a user.
	 */
	crearUsuario(request: CrearUsuarioRequest): Observable<ApiResponse> {
		return this.http.post<ApiResponse>(`${this.apiUrl}/crear`, request);
	}

	/**
	 * Update a user by role and id.
	 */
	actualizarUsuario(
		rol: string,
		id: number,
		request: ActualizarUsuarioRequest,
	): Observable<ApiResponse> {
		return this.http.put<ApiResponse>(
			`${this.apiUrl}/${encodeURIComponent(rol)}/${id}`,
			request,
		);
	}

	/**
	 * Delete a user by role and id.
	 */
	eliminarUsuario(rol: string, id: number): Observable<ApiResponse> {
		return this.http.delete<ApiResponse>(`${this.apiUrl}/${encodeURIComponent(rol)}/${id}`);
	}

	/**
	 * Change user active state.
	 */
	cambiarEstado(rol: string, id: number, estado: boolean): Observable<ApiResponse> {
		return this.http.patch<ApiResponse>(
			`${this.apiUrl}/${encodeURIComponent(rol)}/${id}/estado`,
			{ estado },
		);
	}

	/**
	 * Bulk import students (upsert).
	 */
	importarEstudiantes(estudiantes: ImportarEstudianteItem[]): Observable<ImportarEstudiantesResponse> {
		return this.http.post<ImportarEstudiantesResponse>(`${this.apiUrl}/importar`, { estudiantes });
	}

	/**
	 * One-time migration: encrypt plaintext passwords and hash them.
	 */
	migrarContrasenas(): Observable<{ data: { migrados: number; yaHasheados: number; yaMigrados: number; errores: number } }> {
		return this.http.post<{ data: { migrados: number; yaHasheados: number; yaMigrados: number; errores: number } }>(
			`${this.apiUrl}/migrar-contrasenas`, {});
	}

	/**
	 * Export credentials (name, DNI, password) by role.
	 * For students: filters by year and period (regular vs verano).
	 */
	exportarCredenciales(rol: string, anio?: number, esVerano?: boolean): Observable<CredencialExport[]> {
		const params: Record<string, string> = {};
		if (anio) params['anio'] = anio.toString();
		if (esVerano) params['esVerano'] = 'true';

		return this.http
			.get<CredencialExport[]>(`${this.apiUrl}/exportar-credenciales/${encodeURIComponent(rol)}`, { params })
			.pipe(catchError(() => of([])));
	}

	/**
	 * Get user statistics.
	 */
	obtenerEstadisticas(): Observable<UsuariosEstadisticas | null> {
		return this.http
			.get<UsuariosEstadisticas>(`${this.apiUrl}/estadisticas`)
			.pipe(catchError(() => of(null)));
	}

	/**
	 * Verify if a DNI already exists for a role.
	 */
	verificarDni(rol: string, dni: string, exceptoId?: number): Observable<{ existe: boolean }> {
		const params: Record<string, string> = {};
		if (exceptoId) params['exceptoId'] = exceptoId.toString();

		return this.http
			.get<{
				existe: boolean;
			}>(`${this.apiUrl}/verificar-dni/${encodeURIComponent(rol)}/${dni}`, { params })
			.pipe(catchError(() => of({ existe: false })));
	}
}
// #endregion
