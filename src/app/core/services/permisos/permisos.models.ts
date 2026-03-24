// * DTOs and role helpers for permisos APIs.
// #region Imports
import {
	APP_USER_ROLE_ADMIN_LIST,
	APP_USER_ROLE_LIST,
	AppUserRoleAdmin,
	AppUserRoleValue,
} from '@app/shared/constants';

// #endregion
// #region Implementation

/**
 * Vista DTO.
 */
export interface Vista {
	/** Vista id. */
	id: number;
	/** Route path. */
	ruta: string;
	/** Display name. */
	nombre: string;
	/** State flag or null. */
	estado: number | null;
	/** Concurrencia optimista. */
	rowVersion?: string;
}

/**
 * Create vista request.
 */
export interface CrearVistaRequest {
	ruta: string;
	nombre: string;
}

/**
 * Update vista request.
 */
export interface ActualizarVistaRequest {
	ruta: string;
	nombre: string;
	estado: number;
	rowVersion?: string;
}

/**
 * Role permissions DTO.
 */
export interface PermisoRol {
	id: number;
	rol: AppUserRoleValue;
	vistas: string[];
	rowVersion?: string;
}

/**
 * Create role permissions request.
 */
export interface CrearPermisoRolRequest {
	rol: AppUserRoleValue;
	vistas: string[];
}

/**
 * Update role permissions request.
 */
export interface ActualizarPermisoRolRequest {
	vistas: string[];
	rowVersion?: string;
}

/**
 * User permissions DTO.
 */
export interface PermisoUsuario {
	id: number;
	usuarioId: number;
	rol: AppUserRoleValue;
	vistas: string[];
	nombreUsuario?: string;
	rowVersion?: string;
}

/**
 * Create user permissions request.
 */
export interface CrearPermisoUsuarioRequest {
	usuarioId: number;
	rol: AppUserRoleValue;
	vistas: string[];
}

/**
 * Update user permissions request.
 */
export interface ActualizarPermisoUsuarioRequest {
	vistas: string[];
	rowVersion?: string;
}

/**
 * Result of permissions query for a user.
 */
export interface PermisosUsuarioResultado {
	usuarioId: number;
	rol: AppUserRoleValue;
	vistasPermitidas: string[];
	tienePermisosPersonalizados: boolean;
	/** JWT with exp that indicates when permissions expire. */
	permisosToken?: string;
}

/**
 * Role type values.
 */
export type RolTipo = AppUserRoleValue;

export const ROLES_DISPONIBLES: RolTipo[] = APP_USER_ROLE_LIST;

/**
 * Role type values for admin management.
 */
export type RolTipoAdmin = AppUserRoleAdmin;

export const ROLES_DISPONIBLES_ADMIN: RolTipoAdmin[] = APP_USER_ROLE_ADMIN_LIST;

/**
 * Generic API response DTO.
 */
export interface ApiResponse {
	mensaje: string;
}

/**
 * Vistas stats DTO.
 */
export interface VistasEstadisticas {
	totalVistas: number;
	vistasActivas: number;
	vistasInactivas: number;
	totalModulos: number;
	modulos: string[];
}

/**
 * User search result item.
 */
export interface UsuarioBusqueda {
	id: number;
	nombreCompleto: string;
	rol: AppUserRoleValue;
	dni?: string;
}

/**
 * User search result container.
 */
export interface UsuarioBusquedaResultado {
	usuarios: UsuarioBusqueda[];
	total: number;
}
// #endregion
