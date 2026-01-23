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
}

// Tipos de roles disponibles
export type RolTipo = 'Director' | 'Profesor' | 'Apoderado' | 'Estudiante';

export const ROLES_DISPONIBLES: RolTipo[] = ['Director', 'Profesor', 'Apoderado', 'Estudiante'];

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
