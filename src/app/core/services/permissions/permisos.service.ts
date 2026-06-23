import {
	ActualizarPermisoRolRequest,
	ActualizarPermisoUsuarioRequest,
	ActualizarVistaRequest,
	CapabilityAuth,
	CapabilityCatalogItem,
	CreateCapabilityRequest,
	CrearPermisoRolRequest,
	CrearPermisoUsuarioRequest,
	CrearVistaRequest,
	PermisoRol,
	PermisoUsuario,
	PermisosUsuarioResultado,
	RolCapabilityMatrixRow,
	SetRolCapabilitiesRequest,
	SetUsuarioCapabilitiesRequest,
	UpdateCapabilityRequest,
	UsuarioBusquedaResultado,
	UsuarioCapabilityOverview,
	Vista,
	VistasEstadisticas,
} from './permisos.models';
// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-50-F3a
import { ApiResponse } from '@shared/models';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { logger } from '@core/helpers';

import { HttpClient } from '@angular/common/http';
// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-50-F3a
import { PaginatedResponse } from '@shared/models';
import { environment } from '@env/environment';

/**
 * Permissions API gateway for vistas, roles, and user permissions.
 */
@Injectable({
	providedIn: 'root',
})
export class PermissionsService {
	// CRUD and queries for permisos, vistas, and roles.
	private readonly apiUrl = `${environment.apiUrl}/api/sistema/permisos`;
	private http = inject(HttpClient);

	// #region VISTAS

	/**
	 * List all vistas.
	 */
	getVistas(): Observable<Vista[]> {
		return this.http
			.get<Vista[]>(`${this.apiUrl}/vistas/listar`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * List vistas with pagination and filters.
	 */
	getVistasPaginated(
		page: number,
		pageSize: number,
		search?: string,
		modulo?: string | null,
		estado?: number | null,
	): Observable<PaginatedResponse<Vista>> {
		const params: Record<string, string | number> = { page, pageSize };
		if (search) params['search'] = search;
		if (modulo) params['modulo'] = modulo;
		if (estado !== undefined && estado !== null) params['estado'] = estado;

		return this.http.get<PaginatedResponse<Vista>>(`${this.apiUrl}/vistas/listar`, { params });
	}

	/**
	 * Get vista stats.
	 */
	getVistasEstadisticas(): Observable<VistasEstadisticas> {
		return this.http.get<VistasEstadisticas>(`${this.apiUrl}/vistas/estadisticas`);
	}

	/**
	 * Get a vista by id.
	 */
	getVista(id: number): Observable<Vista | null> {
		return this.http.get<Vista>(`${this.apiUrl}/vistas/${id}`).pipe(catchError(() => of(null)));
	}

	/**
	 * Create a vista.
	 */
	crearVista(request: CrearVistaRequest): Observable<ApiResponse> {
		return this.http.post<ApiResponse>(`${this.apiUrl}/vistas/crear`, request);
	}

	/**
	 * Update a vista by id.
	 */
	actualizarVista(id: number, request: ActualizarVistaRequest): Observable<ApiResponse> {
		return this.http.put<ApiResponse>(`${this.apiUrl}/vistas/${id}/actualizar`, request);
	}

	/**
	 * Delete a vista by id.
	 */
	eliminarVista(id: number): Observable<ApiResponse> {
		return this.http.delete<ApiResponse>(`${this.apiUrl}/vistas/${id}/eliminar`);
	}

	// #endregion
	// #region PERMISOS POR ROL

	/**
	 * List all role permissions.
	 */
	getPermisosRol(): Observable<PermisoRol[]> {
		return this.http
			.get<PermisoRol[]>(`${this.apiUrl}/rol/listar`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * List role permissions with pagination.
	 */
	getPermisosRolPaginated(
		page: number,
		pageSize: number,
		excludeRol?: string,
	): Observable<PaginatedResponse<PermisoRol>> {
		const params: Record<string, string | number> = { page, pageSize };
		if (excludeRol) params['excludeRol'] = excludeRol;

		return this.http.get<PaginatedResponse<PermisoRol>>(`${this.apiUrl}/rol/listar`, { params });
	}

	/**
	 * Get a role permission record by id.
	 */
	getPermisoRol(id: number): Observable<PermisoRol | null> {
		return this.http
			.get<PermisoRol>(`${this.apiUrl}/rol/${id}`)
			.pipe(catchError(() => of(null)));
	}

	/**
	 * Get role permissions by role name.
	 */
	getPermisoRolPorTabla(rol: string): Observable<PermisoRol | null> {
		return this.http
			.get<PermisoRol>(`${this.apiUrl}/rol/por-rol/${encodeURIComponent(rol)}`)
			.pipe(catchError(() => of(null)));
	}

	/**
	 * Create role permissions.
	 */
	crearPermisoRol(request: CrearPermisoRolRequest): Observable<ApiResponse> {
		return this.http.post<ApiResponse>(`${this.apiUrl}/rol/crear`, request);
	}

	/**
	 * Update role permissions by id.
	 */
	actualizarPermisoRol(
		id: number,
		request: ActualizarPermisoRolRequest,
	): Observable<ApiResponse> {
		return this.http.put<ApiResponse>(`${this.apiUrl}/rol/${id}/actualizar`, request);
	}

	/**
	 * Delete role permissions by id.
	 */
	eliminarPermisoRol(id: number): Observable<ApiResponse> {
		return this.http.delete<ApiResponse>(`${this.apiUrl}/rol/${id}/eliminar`);
	}

	// #endregion
	// #region PERMISOS POR USUARIO

	/**
	 * List all user permissions.
	 */
	getPermisosUsuario(): Observable<PermisoUsuario[]> {
		return this.http
			.get<PermisoUsuario[]>(`${this.apiUrl}/usuario/listar`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * Get a user permission record by id.
	 */
	getPermisoUsuario(id: number): Observable<PermisoUsuario | null> {
		return this.http
			.get<PermisoUsuario>(`${this.apiUrl}/usuario/${id}`)
			.pipe(catchError(() => of(null)));
	}

	/**
	 * Get user permissions by role name.
	 */
	getPermisosUsuarioPorRol(rol: string): Observable<PermisoUsuario[]> {
		return this.http
			.get<PermisoUsuario[]>(`${this.apiUrl}/usuario/por-rol/${encodeURIComponent(rol)}`)
			.pipe(catchError(() => of([])));
	}

	/**
	 * Create user permissions.
	 */
	crearPermisoUsuario(request: CrearPermisoUsuarioRequest): Observable<ApiResponse> {
		return this.http.post<ApiResponse>(`${this.apiUrl}/usuario/crear`, request);
	}

	/**
	 * Update user permissions by id.
	 */
	actualizarPermisoUsuario(
		id: number,
		request: ActualizarPermisoUsuarioRequest,
	): Observable<ApiResponse> {
		return this.http.put<ApiResponse>(`${this.apiUrl}/usuario/${id}/actualizar`, request);
	}

	/**
	 * Delete user permissions by id.
	 */
	eliminarPermisoUsuario(id: number): Observable<ApiResponse> {
		return this.http.delete<ApiResponse>(`${this.apiUrl}/usuario/${id}/eliminar`);
	}

	// #endregion
	// #region CAPABILITIES

	private readonly authApiUrl = `${environment.apiUrl}/api/auth`;

	getMyCapabilities(): Observable<CapabilityAuth[]> {
		return this.http
			.get<unknown>(`${this.authApiUrl}/capabilities`)
			.pipe(
				map((res) => normalizeCapabilitiesResponse(res)),
				catchError((err) => {
					logger.warn('[PermissionsService] Error loading capabilities — fallback empty', err?.status);
					return of([]);
				}),
			);
	}

	// #endregion
	// #region CONSULTA DE PERMISOS (legacy — admin pages)

	/**
	 * Get permissions for a specific user and role.
	 * @deprecated Legacy endpoint — admin pages only.
	 */
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
	 * @deprecated Use getMyCapabilities() instead. This endpoint no longer exists in BE.
	 */
	getMisPermisos(): Observable<PermisosUsuarioResultado | null> {
		return this.http
			.get<PermisosUsuarioResultado>(`${this.apiUrl}/mis-permisos`)
			.pipe(
				catchError((err) => {
					logger.warn('[PermissionsService] Error al cargar mis permisos — usando fallback vacío', err?.status);
					return of(null);
				}),
			);
	}

	// #endregion
	// #region USER SEARCH

	/**
	 * Search users by term and role.
	 */
	buscarUsuarios(termino?: string, rol?: string): Observable<UsuarioBusquedaResultado> {
		const params: Record<string, string> = {};
		if (termino) params['termino'] = termino;
		if (rol) params['rol'] = rol;

		return this.http
			.get<UsuarioBusquedaResultado>(`${this.apiUrl}/usuario/buscar-usuarios`, { params })
			.pipe(catchError(() => of({ usuarios: [], total: 0 })));
	}

	/**
	 * List users by role.
	 * @deprecated Legacy — use searchUsers.
	 */
	listarUsuariosPorRol(rol: string): Observable<UsuarioBusquedaResultado> {
		return this.http
			.get<UsuarioBusquedaResultado>(
				`${this.apiUrl}/usuario/usuarios-por-rol/${encodeURIComponent(rol)}`,
			)
			.pipe(catchError(() => of({ usuarios: [], total: 0 })));
	}
	// #endregion

	// #region CAPABILITY ADMIN (P57)

	private readonly capAdminUrl = `${environment.apiUrl}/api/admin/capabilities`;

	// -- Catalog --

	getCapabilityCatalog(): Observable<CapabilityCatalogItem[]> {
		return this.http
			.get<CapabilityCatalogItem[]>(`${this.capAdminUrl}/roles/catalog`)
			.pipe(catchError(() => of([])));
	}

	createCapability(request: CreateCapabilityRequest): Observable<CapabilityCatalogItem> {
		return this.http.post<CapabilityCatalogItem>(`${this.capAdminUrl}/catalog`, request);
	}

	updateCapability(id: number, request: UpdateCapabilityRequest): Observable<CapabilityCatalogItem> {
		return this.http.patch<CapabilityCatalogItem>(`${this.capAdminUrl}/catalog/${id}`, request);
	}

	deleteCapability(id: number): Observable<string> {
		return this.http.delete<string>(`${this.capAdminUrl}/catalog/${id}`);
	}

	// -- Role capabilities --

	getRolCapabilityMatrix(): Observable<RolCapabilityMatrixRow[]> {
		return this.http
			.get<RolCapabilityMatrixRow[]>(`${this.capAdminUrl}/roles/matrix`)
			.pipe(catchError(() => of([])));
	}

	setRolCapabilities(rolId: number, request: SetRolCapabilitiesRequest): Observable<string> {
		return this.http.put<string>(`${this.capAdminUrl}/roles/${rolId}/capabilities`, request);
	}

	// -- User capabilities --

	getUsuarioCapabilityOverview(entityId: number, rolId: number): Observable<UsuarioCapabilityOverview | null> {
		return this.http
			.get<UsuarioCapabilityOverview>(`${this.capAdminUrl}/users/${entityId}/rol/${rolId}`)
			.pipe(catchError(() => of(null)));
	}

	setUsuarioCapabilities(
		entityId: number,
		rolId: number,
		request: SetUsuarioCapabilitiesRequest,
	): Observable<string> {
		return this.http.put<string>(`${this.capAdminUrl}/users/${entityId}/rol/${rolId}`, request);
	}

	getUsuarioEffectiveCapabilities(entityId: number, rolId: number): Observable<string[]> {
		return this.http
			.get<string[]>(`${this.capAdminUrl}/users/${entityId}/rol/${rolId}/effective`)
			.pipe(catchError(() => of([])));
	}

	searchUsers(termino?: string, rol?: string): Observable<UsuarioBusquedaResultado> {
		const params: Record<string, string> = {};
		if (termino) params['termino'] = termino;
		if (rol) params['rol'] = rol;

		return this.http
			.get<UsuarioBusquedaResultado>(`${this.capAdminUrl}/users/search`, { params })
			.pipe(catchError(() => of({ usuarios: [], total: 0 })));
	}

	// #endregion
}

function normalizeCapabilitiesResponse(res: unknown): CapabilityAuth[] {
	if (Array.isArray(res)) {
		if (res.length === 0) return [];
		if (typeof res[0] === 'string') return res.map((code: string) => ({ codigo: code, ruta: null }));
		return res as CapabilityAuth[];
	}
	const wrapped = res as { data?: CapabilityAuth[] };
	if (wrapped.data && Array.isArray(wrapped.data)) return wrapped.data;
	return [];
}
