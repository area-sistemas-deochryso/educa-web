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

export type RolUsuario = 'Director' | 'Profesor' | 'Apoderado' | 'Estudiante' | 'Asistente Administrativo';

export const ROLES_USUARIOS: RolUsuario[] = [
	'Director',
	'Profesor',
	'Apoderado',
	'Estudiante',
	'Asistente Administrativo',
];

// Roles disponibles para gestión en admin (sin Apoderado)
export type RolUsuarioAdmin = 'Director' | 'Profesor' | 'Estudiante' | 'Asistente Administrativo';

export const ROLES_USUARIOS_ADMIN: RolUsuarioAdmin[] = [
	'Director',
	'Profesor',
	'Estudiante',
	'Asistente Administrativo',
];
