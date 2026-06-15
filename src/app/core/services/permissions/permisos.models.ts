// * DTOs and role helpers for permisos APIs.
// #region Imports
import { APP_USER_ROLE_LIST, AppUserRoleValue } from '@app/shared/constants';

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

/** @deprecated 2026-06-08 — use Rol from @shared/models/rol.models. Remove after 2026-07-08. */
export type RolTipo = AppUserRoleValue;

/** @deprecated 2026-06-08 — use RolService.all(). Remove after 2026-07-08. */
export const ROLES_DISPONIBLES: RolTipo[] = APP_USER_ROLE_LIST;

/** @deprecated 2026-06-08 — use Rol from @shared/models/rol.models. Remove after 2026-07-08. */
export type RolTipoAdmin = AppUserRoleValue;

/** @deprecated 2026-06-08 — use RolService.all() filtered by esStaff. Remove after 2026-07-08. */
export const ROLES_DISPONIBLES_ADMIN: RolTipoAdmin[] = APP_USER_ROLE_LIST;

/**
 * Vistas stats DTO.
 * @deprecated Legacy — vistas endpoints removed. Use capability catalog.
 */
export interface VistasEstadisticas {
	totalVistas: number;
	vistasActivas: number;
	vistasInactivas: number;
	totalModulos: number;
	modulos: string[];
}

// #region Capability DTOs (P57)

export interface CapabilityCatalogItem {
	id: number;
	codigo: string;
	nombre: string;
	modulo: string;
	descripcion?: string;
	orden: number;
	estado: boolean | number | null;
}

export interface CreateCapabilityRequest {
	codigo: string;
	nombre: string;
	modulo: string;
	descripcion?: string;
}

export interface UpdateCapabilityRequest {
	nombre: string;
	modulo: string;
	descripcion?: string;
	orden?: number;
}

export interface RolCapabilityMatrixRow {
	rolId: number;
	rolNombre: string;
	capabilityIds: number[];
}

export interface SetRolCapabilitiesRequest {
	capabilityIds: number[];
}

export interface UsuarioCapabilityOverview {
	entityId: number;
	rolId: number;
	inheritedCapabilityIds: number[];
	grantIds: number[];
	denyIds: number[];
}

export interface SetUsuarioCapabilitiesRequest {
	grants: number[];
	denies: number[];
}

// #endregion

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
