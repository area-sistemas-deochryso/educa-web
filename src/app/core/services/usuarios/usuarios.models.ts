// * Usuario DTOs and role helpers.
import {
	APP_USER_ROLE_ADMIN_LIST,
	APP_USER_ROLE_LIST,
	AppUserRoleAdmin,
	AppUserRoleValue,
} from '@app/shared/constants';

export interface UsuarioLista {
	id: number;
	dni: string;
	nombres: string;
	apellidos: string;
	nombreCompleto: string;
	rol: string;
	estado: boolean;
	fechaRegistro: string;
	telefono?: string;
	correo?: string;
	sedeId?: number;
	sedeNombre?: string;
	// Campos de apoderado para estudiante
	nombreApoderado?: string;
	telefonoApoderado?: string;
}

export interface UsuarioDetalle extends UsuarioLista {
	fechaNacimiento?: string;
	grado?: string;
	seccion?: string;
	correoApoderado?: string;
	usuarioRegistro?: string;
	usuarioModificacion?: string;
	fechaModificacion?: string;
	// Campos para Profesor
	salonId?: number;
	salonNombre?: string;
	esTutor?: boolean;
}

export interface CrearUsuarioRequest {
	dni: string;
	nombres: string;
	apellidos: string;
	contrasena: string;
	rol: string;
	sedeId?: number;
	telefono?: string;
	correo?: string;
	fechaNacimiento?: string;
	grado?: string;
	seccion?: string;
	// Campos para Estudiante (apoderado)
	nombreApoderado?: string;
	telefonoApoderado?: string;
	correoApoderado?: string;
	// Campos para Profesor
	salonId?: number;
	esTutor?: boolean;
}

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
	// Campos para Estudiante (apoderado)
	nombreApoderado?: string;
	telefonoApoderado?: string;
	correoApoderado?: string;
	// Campos para Profesor
	salonId?: number;
	esTutor?: boolean;
}

export interface UsuariosEstadisticas {
	totalUsuarios: number;
	totalDirectores: number;
	totalAsistentesAdministrativos: number;
	totalProfesores: number;
	totalApoderados: number;
	totalEstudiantes: number;
	usuariosActivos: number;
	usuariosInactivos: number;
}

export type RolUsuario = AppUserRoleValue;

export const ROLES_USUARIOS: RolUsuario[] = APP_USER_ROLE_LIST;

// Roles disponibles para gestión en admin (sin Apoderado)
export type RolUsuarioAdmin = AppUserRoleAdmin;

export const ROLES_USUARIOS_ADMIN: RolUsuarioAdmin[] = APP_USER_ROLE_ADMIN_LIST;
