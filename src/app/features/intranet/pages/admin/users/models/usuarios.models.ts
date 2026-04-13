// * Usuario DTOs and role helpers.
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
 * User list DTO for table views.
 */
export interface UsuarioLista {
	id: number;
	dni: string;
	nombres: string;
	apellidos: string;
	nombreCompleto: string;
	rol: AppUserRoleValue;
	estado: boolean;
	fechaRegistro: string;
	telefono?: string;
	correo?: string;
	sedeId?: number;
	sedeNombre?: string;
	// Salón (estudiante: su salón único; profesor: salón donde es docente)
	salonNombre?: string;
	// Guardian fields for student
	nombreApoderado?: string;
	telefonoApoderado?: string;
	correoApoderado?: string;
	// Optimistic concurrency
	rowVersion?: string;
}

/**
 * User detail DTO with additional fields.
 */
export interface UsuarioDetalle extends UsuarioLista {
	contrasena?: string;
	fechaNacimiento?: string;
	grado?: string;
	seccion?: string;
	correoApoderado?: string;
	usuarioRegistro?: string;
	usuarioModificacion?: string;
	fechaModificacion?: string;
	// Teacher fields
	salonId?: number;
	salonNombre?: string;
	esTutor?: boolean;
}

/**
 * Create user request payload.
 */
export interface CrearUsuarioRequest {
	dni: string;
	nombres: string;
	apellidos: string;
	contrasena: string;
	rol: AppUserRoleValue;
	sedeId?: number;
	telefono?: string;
	correo?: string;
	fechaNacimiento?: string;
	grado?: string;
	seccion?: string;
	// Student guardian fields
	nombreApoderado?: string;
	telefonoApoderado?: string;
	correoApoderado?: string;
	// Teacher fields
	salonId?: number;
	esTutor?: boolean;
}

/**
 * Update user request payload.
 */
export interface ActualizarUsuarioRequest {
	dni: string;
	nombres: string;
	apellidos: string;
	contrasena?: string;
	estado: boolean;
	sedeId?: number;
	telefono?: string;
	correo?: string;
	fechaNacimiento?: string;
	grado?: string;
	seccion?: string;
	// Student guardian fields
	nombreApoderado?: string;
	telefonoApoderado?: string;
	correoApoderado?: string;
	// Teacher fields
	salonId?: number;
	esTutor?: boolean;
	// Optimistic concurrency
	rowVersion?: string;
}

/**
 * User statistics DTO.
 */
export interface UsuariosEstadisticas {
	totalUsuarios: number;
	totalDirectores: number;
	totalAsistentesAdministrativos: number;
	totalPromotores: number;
	totalProfesores: number;
	totalApoderados: number;
	totalEstudiantes: number;
	usuariosActivos: number;
	usuariosInactivos: number;
}

/**
 * User role type values.
 */
export type RolUsuario = AppUserRoleValue;

export const ROLES_USUARIOS: RolUsuario[] = APP_USER_ROLE_LIST;

/**
 * User role type values for admin management.
 */
export type RolUsuarioAdmin = AppUserRoleAdmin;

export const ROLES_USUARIOS_ADMIN: RolUsuarioAdmin[] = APP_USER_ROLE_ADMIN_LIST;

/**
 * Credential export DTO for Excel generation.
 */
export interface CredencialExport {
	nombreCompleto: string;
	dni: string;
	contrasena: string | null;
	grado: string | null;
	seccion: string | null;
}

/**
 * Payload for a single student in a bulk import request.
 */
export interface ImportarEstudianteItem {
	apellidos: string;
	nombres: string;
	dni?: string;
	grado: string;
	seccion: string;
	nombreApoderado?: string;
	correoApoderado?: string;
}

/**
 * Response from bulk student import endpoint.
 */
export interface ImportarEstudiantesResponse {
	creados: number;
	actualizados: number;
	rechazados: number;
	errores: { fila: number; nombre: string; dni: string; razon: string }[];
}

// #endregion
