// * Usuario DTOs and role helpers.
// #region Role Tabs
export type RoleTab = 'estudiantes' | 'profesores' | 'admin' | null;

export const ROLE_TAB_CONFIG = [
	{ key: null as RoleTab, label: 'Todos', icon: 'pi pi-users' },
	{ key: 'estudiantes' as RoleTab, label: 'Estudiantes', icon: 'pi pi-book' },
	{ key: 'profesores' as RoleTab, label: 'Profesores', icon: 'pi pi-graduation-cap' },
	{ key: 'admin' as RoleTab, label: 'Personal Admin', icon: 'pi pi-shield' },
] as const;
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
	rol: string;
	estado: boolean;
	fechaRegistro: string;
	telefono?: string;
	correo?: string;
	sedeId?: number;
	sedeNombre?: string;
	// Salón (estudiante: su salón único; profesor: primer salón activo como docente)
	salonNombre?: string;
	// Profesor con múltiples salones activos (null para otros roles)
	salonesNombres?: string[];
	// Guardian fields for student
	nombreApoderado?: string;
	telefonoApoderado?: string;
	correoApoderado?: string;
	// Optimistic concurrency
	rowVersion?: string;
}

/**
 * Sede catalog entry (dropdown option).
 */
export interface SedeSimpleDto {
	id: number;
	nombre: string;
}

/**
 * Salon assignment for a professor (request payload).
 */
export interface SalonAsignacion {
	salonId: number;
	esTutor: boolean;
}

/**
 * Salon info returned from detail endpoint (professor).
 */
export interface ProfesorSalonInfo {
	salonId: number;
	salonNombre: string;
	esTutor: boolean;
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
	// Student salon (single)
	salonId?: number;
	salonNombre?: string;
	// Teacher salons (multiple)
	salones?: ProfesorSalonInfo[];
}

/**
 * Create user request payload.
 */
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
	// Student guardian fields
	nombreApoderado?: string;
	telefonoApoderado?: string;
	correoApoderado?: string;
	// Student salon (single)
	salonId?: number;
	// Teacher salons (multiple with tutor flag)
	salones?: SalonAsignacion[];
	confirmarDuplicado?: boolean;
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
	// Student salon (single)
	salonId?: number;
	// Teacher salons (multiple with tutor flag)
	salones?: SalonAsignacion[];
	confirmarDuplicado?: boolean;
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
	totalCoordinadoresAcademicos: number;
	totalAdministradores: number;
	totalProfesores: number;
	totalApoderados: number;
	totalEstudiantes: number;
	usuariosActivos: number;
	usuariosInactivos: number;
}

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

/**
 * Duplicate name match returned by BE in 409 response (extensions.duplicateMatch).
 */
export interface DuplicateNameMatch {
	codID: number;
	dniPartial: string;
	grado: string | null;
	seccion: string | null;
}

// #endregion
