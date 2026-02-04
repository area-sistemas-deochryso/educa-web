// * DTOs and role helpers for permisos APIs.
import {
	APP_USER_ROLE_ADMIN_LIST,
	APP_USER_ROLE_LIST,
	AppUserRoleAdmin,
	AppUserRoleValue,
} from '@app/shared/constants';

// Vista DTOs
export interface Vista {
	id: number;
	ruta: string;
	nombre: string;
	estado: number | null;
}

export interface CrearVistaRequest {
	ruta: string;
	nombre: string;
}

export interface ActualizarVistaRequest {
	ruta: string;
	nombre: string;
	estado: number;
}

// Permisos por Rol DTOs
export interface PermisoRol {
	id: number;
	rol: string;
	vistas: string[];
}

export interface CrearPermisoRolRequest {
	rol: string;
	vistas: string[];
}

export interface ActualizarPermisoRolRequest {
	vistas: string[];
}

// Permisos por Usuario DTOs
export interface PermisoUsuario {
	id: number;
	usuarioId: number;
	rol: string;
	vistas: string[];
	nombreUsuario?: string;
}

export interface CrearPermisoUsuarioRequest {
	usuarioId: number;
	rol: string;
	vistas: string[];
}

export interface ActualizarPermisoUsuarioRequest {
	vistas: string[];
}

// Consulta de permisos
export interface PermisosUsuarioResultado {
	usuarioId: number;
	rol: string;
	vistasPermitidas: string[];
	tienePermisosPersonalizados: boolean;
	/** JWT con exp de 4h que indica cuándo vencen estos permisos */
	permisosToken?: string;
}

// Tipos de roles disponibles
export type RolTipo = AppUserRoleValue;

export const ROLES_DISPONIBLES: RolTipo[] = APP_USER_ROLE_LIST;

// Roles disponibles para gestión en admin (sin Apoderado)
export type RolTipoAdmin = AppUserRoleAdmin;

export const ROLES_DISPONIBLES_ADMIN: RolTipoAdmin[] = APP_USER_ROLE_ADMIN_LIST;

// Response genérico del API
export interface ApiResponse {
	mensaje: string;
}

// Búsqueda de usuarios
export interface UsuarioBusqueda {
	id: number;
	nombreCompleto: string;
	rol: string;
	dni?: string;
}

export interface UsuarioBusquedaResultado {
	usuarios: UsuarioBusqueda[];
	total: number;
}
