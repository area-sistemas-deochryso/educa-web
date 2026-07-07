// * DTOs and role helpers for permisos APIs.
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
	rol: string;
	vistas: string[];
	rowVersion?: string;
}

/**
 * Create role permissions request.
 */
export interface CrearPermisoRolRequest {
	rol: string;
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
	rol: string;
	vistas: string[];
	nombreUsuario?: string;
	rowVersion?: string;
}

/**
 * Create user permissions request.
 */
export interface CrearPermisoUsuarioRequest {
	usuarioId: number;
	rol: string;
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

export interface CapabilityAuth {
	codigo: string;
	ruta: string | null;
}

export interface CapabilityCatalogItem {
	id: number;
	codigo: string;
	nombre: string;
	modulo: string;
	descripcion?: string;
	orden: number;
	ruta?: string | null;
	estado: boolean | number | null;
}

export interface CreateCapabilityRequest {
	codigo: string;
	nombre: string;
	modulo: string;
	descripcion?: string;
	ruta?: string;
}

export interface UpdateCapabilityRequest {
	nombre: string;
	modulo: string;
	descripcion?: string;
	orden?: number;
	ruta?: string;
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
	rol: string;
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
