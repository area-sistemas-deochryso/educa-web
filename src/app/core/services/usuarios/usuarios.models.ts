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
}

export interface UsuarioDetalle extends UsuarioLista {
	fechaNacimiento?: string;
	grado?: string;
	seccion?: string;
	usuarioRegistro?: string;
	usuarioModificacion?: string;
	fechaModificacion?: string;
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
}

export interface UsuariosEstadisticas {
	totalUsuarios: number;
	totalDirectores: number;
	totalProfesores: number;
	totalApoderados: number;
	totalEstudiantes: number;
	usuariosActivos: number;
	usuariosInactivos: number;
}

export type RolUsuario = 'Director' | 'Profesor' | 'Apoderado' | 'Estudiante';

export const ROLES_USUARIOS: RolUsuario[] = ['Director', 'Profesor', 'Apoderado', 'Estudiante'];

// Roles disponibles para gestión en admin (sin Apoderado)
export type RolUsuarioAdmin = 'Director' | 'Profesor' | 'Estudiante';

export const ROLES_USUARIOS_ADMIN: RolUsuarioAdmin[] = ['Director', 'Profesor', 'Estudiante'];
