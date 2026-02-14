// #region Imports
import {
	ActualizarUsuarioRequest,
	CrearUsuarioRequest,
	UsuarioDetalle,
	UsuarioLista,
	UsuariosEstadisticas,
} from './usuarios.models';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { ApiResponse } from '../permisos';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

// #endregion
// #region Implementation
@Injectable({
	providedIn: 'root',
})
export class UsuariosService {
	// * CRUD wrapper for usuarios endpoints.
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/usuarios`;
	private http = inject(HttpClient);

	listarUsuarios(rol?: string, estado?: boolean): Observable<UsuarioLista[]> {
		const params: Record<string, string> = {};
		if (rol) params['rol'] = rol;
		if (estado !== undefined) params['estado'] = estado.toString();

		return this.http
			.get<UsuarioLista[]>(`${this.apiUrl}/listar`, { params })
			.pipe(catchError(() => of([])));
	}

	obtenerUsuario(rol: string, id: number): Observable<UsuarioDetalle | null> {
		return this.http
			.get<UsuarioDetalle>(`${this.apiUrl}/${encodeURIComponent(rol)}/${id}`)
			.pipe(catchError(() => of(null)));
	}

	crearUsuario(request: CrearUsuarioRequest): Observable<ApiResponse> {
		return this.http.post<ApiResponse>(`${this.apiUrl}/crear`, request);
	}

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

	eliminarUsuario(rol: string, id: number): Observable<ApiResponse> {
		return this.http.delete<ApiResponse>(`${this.apiUrl}/${encodeURIComponent(rol)}/${id}`);
	}

	cambiarEstado(rol: string, id: number, estado: boolean): Observable<ApiResponse> {
		return this.http.patch<ApiResponse>(
			`${this.apiUrl}/${encodeURIComponent(rol)}/${id}/estado`,
			{ estado },
		);
	}

	obtenerEstadisticas(): Observable<UsuariosEstadisticas | null> {
		return this.http
			.get<UsuariosEstadisticas>(`${this.apiUrl}/estadisticas`)
			.pipe(catchError(() => of(null)));
	}

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
