import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { environment } from '@env/environment';

import {
	Vista,
	CrearVistaRequest,
	ActualizarVistaRequest,
	PermisoRol,
	CrearPermisoRolRequest,
	ActualizarPermisoRolRequest,
	PermisoUsuario,
	CrearPermisoUsuarioRequest,
	ActualizarPermisoUsuarioRequest,
	PermisosUsuarioResultado,
	ApiResponse,
	UsuarioBusquedaResultado,
} from './permisos.models';

@Injectable({
	providedIn: 'root',
})
export class PermisosService {
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/permisos`;

	constructor(private http: HttpClient) {}

	// ========== VISTAS ==========

	getVistas(): Observable<Vista[]> {
		return this.http
			.get<Vista[]>(`${this.apiUrl}/vistas/listar`)
			.pipe(catchError(() => of([])));
	}

	getVista(id: number): Observable<Vista | null> {
		return this.http.get<Vista>(`${this.apiUrl}/vistas/${id}`).pipe(catchError(() => of(null)));
	}

	crearVista(request: CrearVistaRequest): Observable<ApiResponse> {
		return this.http.post<ApiResponse>(`${this.apiUrl}/vistas/crear`, request);
	}

	actualizarVista(id: number, request: ActualizarVistaRequest): Observable<ApiResponse> {
		return this.http.put<ApiResponse>(`${this.apiUrl}/vistas/${id}/actualizar`, request);
	}

	eliminarVista(id: number): Observable<ApiResponse> {
		return this.http.delete<ApiResponse>(`${this.apiUrl}/vistas/${id}/eliminar`);
	}

	// ========== PERMISOS POR ROL ==========

	getPermisosRol(): Observable<PermisoRol[]> {
		return this.http
			.get<PermisoRol[]>(`${this.apiUrl}/rol/listar`)
			.pipe(catchError(() => of([])));
	}

	getPermisoRol(id: number): Observable<PermisoRol | null> {
		return this.http
			.get<PermisoRol>(`${this.apiUrl}/rol/${id}`)
			.pipe(catchError(() => of(null)));
	}

	getPermisoRolPorTabla(rol: string): Observable<PermisoRol | null> {
		return this.http
			.get<PermisoRol>(`${this.apiUrl}/rol/por-rol/${encodeURIComponent(rol)}`)
			.pipe(catchError(() => of(null)));
	}

	crearPermisoRol(request: CrearPermisoRolRequest): Observable<ApiResponse> {
		return this.http.post<ApiResponse>(`${this.apiUrl}/rol/crear`, request);
	}

	actualizarPermisoRol(
		id: number,
		request: ActualizarPermisoRolRequest,
	): Observable<ApiResponse> {
		return this.http.put<ApiResponse>(`${this.apiUrl}/rol/${id}/actualizar`, request);
	}

	eliminarPermisoRol(id: number): Observable<ApiResponse> {
		return this.http.delete<ApiResponse>(`${this.apiUrl}/rol/${id}/eliminar`);
	}

	// ========== PERMISOS POR USUARIO ==========

	getPermisosUsuario(): Observable<PermisoUsuario[]> {
		return this.http
			.get<PermisoUsuario[]>(`${this.apiUrl}/usuario/listar`)
			.pipe(catchError(() => of([])));
	}

	getPermisoUsuario(id: number): Observable<PermisoUsuario | null> {
		return this.http
			.get<PermisoUsuario>(`${this.apiUrl}/usuario/${id}`)
			.pipe(catchError(() => of(null)));
	}

	getPermisosUsuarioPorRol(rol: string): Observable<PermisoUsuario[]> {
		return this.http
			.get<PermisoUsuario[]>(`${this.apiUrl}/usuario/por-rol/${encodeURIComponent(rol)}`)
			.pipe(catchError(() => of([])));
	}

	crearPermisoUsuario(request: CrearPermisoUsuarioRequest): Observable<ApiResponse> {
		return this.http.post<ApiResponse>(`${this.apiUrl}/usuario/crear`, request);
	}

	actualizarPermisoUsuario(
		id: number,
		request: ActualizarPermisoUsuarioRequest,
	): Observable<ApiResponse> {
		return this.http.put<ApiResponse>(`${this.apiUrl}/usuario/${id}/actualizar`, request);
	}

	eliminarPermisoUsuario(id: number): Observable<ApiResponse> {
		return this.http.delete<ApiResponse>(`${this.apiUrl}/usuario/${id}/eliminar`);
	}

	// ========== CONSULTA DE PERMISOS ==========

	consultarPermisosDeUsuario(
		usuarioId: number,
		rol: string,
	): Observable<PermisosUsuarioResultado | null> {
		return this.http
			.get<PermisosUsuarioResultado>(
				`${this.apiUrl}/usuario/consultar/${usuarioId}/${encodeURIComponent(rol)}`,
			)
			.pipe(catchError(() => of(null)));
	}

	/**
	 * Obtiene los permisos del usuario autenticado actual
	 * Usa el token JWT para identificar al usuario
	 * Nota: Este endpoint está en un controller separado sin restricción de rol
	 */
	getMisPermisos(): Observable<PermisosUsuarioResultado | null> {
		return this.http
			.get<PermisosUsuarioResultado>(`${this.apiUrl}/mis-permisos`)
			.pipe(catchError(() => of(null)));
	}

	// ========== BÚSQUEDA DE USUARIOS ==========

	buscarUsuarios(termino?: string, rol?: string): Observable<UsuarioBusquedaResultado> {
		const params: Record<string, string> = {};
		if (termino) params['termino'] = termino;
		if (rol) params['rol'] = rol;

		return this.http
			.get<UsuarioBusquedaResultado>(`${this.apiUrl}/usuario/buscar-usuarios`, { params })
			.pipe(catchError(() => of({ usuarios: [], total: 0 })));
	}

	listarUsuariosPorRol(rol: string): Observable<UsuarioBusquedaResultado> {
		return this.http
			.get<UsuarioBusquedaResultado>(
				`${this.apiUrl}/usuario/usuarios-por-rol/${encodeURIComponent(rol)}`,
			)
			.pipe(catchError(() => of({ usuarios: [], total: 0 })));
	}
}
