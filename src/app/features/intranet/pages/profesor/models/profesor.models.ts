// #region DTOs del backend

/**
 * Schedule data for a professor.
 */
export interface HorarioProfesorDto {
	/** Schedule id. */
	id: number;
	/** Day of week number. */
	diaSemana: number;
	/** Day of week label. */
	diaSemanaDescripcion: string;
	/** Start time. */
	horaInicio: string;
	/** End time. */
	horaFin: string;
	/** Active flag. */
	estado: boolean;
	/** Classroom id. */
	salonId: number;
	/** Classroom label. */
	salonDescripcion: string;
	/** Course id. */
	cursoId: number;
	/** Course name. */
	cursoNombre: string;
	/** Profesor id or null. */
	profesorId: number | null;
	/** Profesor full name or null. */
	profesorNombreCompleto: string | null;
	/** Student count. */
	cantidadEstudiantes: number;
}

/**
 * Response wrapper for tutor classroom information.
 */
export interface SalonTutoriaResponse {
	/** Response message. */
	mensaje: string;
	/** Tutor classroom detail or null. */
	data: SalonTutoriaDto | null;
}

/**
 * Tutor classroom detail for the professor.
 */
export interface SalonTutoriaDto {
	/** Professor classroom relation id. */
	profesorSalonId: number;
	/** Profesor id. */
	profesorId: number;
	/** Classroom id. */
	salonId: number;
	/** Classroom name. */
	salonNombre: string;
	/** Grade name. */
	grado: string;
	/** Section name. */
	seccion: string;
	/** True when professor is tutor. */
	esTutor: boolean;
	/** Active flag. */
	estado: boolean;
}

// #endregion
// #region DTOs de mis-estudiantes

/**
 * Professor classrooms with aggregated student counts.
 */
export interface ProfesorMisSalonesConEstudiantesDto {
	/** List of classrooms with students. */
	salones: ProfesorSalonConEstudiantesDto[];
	/** Total students across classrooms. */
	totalEstudiantes: number;
	/** Total classrooms. */
	totalSalones: number;
}

/**
 * Classroom detail with student list.
 */
export interface ProfesorSalonConEstudiantesDto {
	/** Classroom id. */
	salonId: number;
	/** Grade name. */
	grado: string;
	/** Section name. */
	seccion: string;
	/** Classroom display name. */
	nombreSalon: string;
	/** Academic year. */
	anio: number;
	/** True when professor is tutor. */
	esTutor: boolean;
	/** Student count. */
	cantidadEstudiantes: number;
	/** Student list for the classroom. */
	estudiantes: ProfesorEstudianteSalonDto[];
}

/**
 * Student item inside a classroom list.
 */
export interface ProfesorEstudianteSalonDto {
	/** Student id. */
	estudianteId: number;
	/** Student DNI. */
	dni: string;
	/** Student full name. */
	nombreCompleto: string;
}

// #endregion
// #region DTOs de curso-contenido

/**
 * Course content detail for a schedule.
 */
export interface CursoContenidoDetalleDto {
	/** Content id. */
	id: number;
	/** Schedule id. */
	horarioId: number;
	/** Total number of weeks. */
	numeroSemanas: number;
	/** Active flag. */
	estado: boolean;
	/** Course name. */
	cursoNombre: string;
	/** Classroom label. */
	salonDescripcion: string;
	/** List of weeks with files and tasks. */
	semanas: CursoContenidoSemanaDto[];
}

/**
 * Week detail inside course content.
 */
export interface CursoContenidoSemanaDto {
	/** Week id. */
	id: number;
	/** Week number. */
	numeroSemana: number;
	/** Week title or null. */
	titulo: string | null;
	/** Week description or null. */
	descripcion: string | null;
	/** Teacher message or null. */
	mensajeDocente: string | null;
	/** Attachments for the week. */
	archivos: CursoContenidoArchivoDto[];
	/** Tasks for the week. */
	tareas: CursoContenidoTareaDto[];
	/** Concurrencia optimista. */
	rowVersion?: string;
}

/**
 * Attachment metadata for a week.
 */
export interface CursoContenidoArchivoDto {
	/** Attachment id. */
	id: number;
	/** File name. */
	nombreArchivo: string;
	/** Public file URL. */
	urlArchivo: string;
	/** File MIME type or null. */
	tipoArchivo: string | null;
	/** File size in bytes or null. */
	tamanoBytes: number | null;
	/** Registration date string. */
	fechaReg: string;
}

/**
 * Task metadata for a week.
 */
export interface CursoContenidoTareaDto {
	/** Task id. */
	id: number;
	/** Task title. */
	titulo: string;
	/** Task description or null. */
	descripcion: string | null;
	/** Due date string or null. */
	fechaLimite: string | null;
	/** Registration date string. */
	fechaReg: string;
	/** Concurrencia optimista. */
	rowVersion?: string;
}

/**
 * Request to create course content.
 */
export interface CrearCursoContenidoRequest {
	/** Schedule id. */
	horarioId: number;
	/** Number of weeks to create. */
	numeroSemanas: number;
}

/**
 * Request to update a week.
 */
export interface ActualizarSemanaRequest {
	/** Week title or null. */
	titulo: string | null;
	/** Week description or null. */
	descripcion: string | null;
	/** Teacher message or null. */
	mensajeDocente: string | null;
	/** Concurrencia optimista. */
	rowVersion?: string;
}

/**
 * Request to register attachment metadata.
 */
export interface RegistrarArchivoRequest {
	/** File name. */
	nombreArchivo: string;
	/** Public file URL. */
	urlArchivo: string;
	/** File MIME type or null. */
	tipoArchivo: string | null;
	/** File size in bytes or null. */
	tamanoBytes: number | null;
}

/**
 * Request to create a task.
 */
export interface CrearTareaRequest {
	/** Task title. */
	titulo: string;
	/** Task description or null. */
	descripcion: string | null;
	/** Due date string or null. */
	fechaLimite: string | null;
}

/**
 * Request to update a task.
 */
export interface ActualizarTareaRequest {
	/** Task title. */
	titulo: string;
	/** Task description or null. */
	descripcion: string | null;
	/** Due date string or null. */
	fechaLimite: string | null;
	/** Concurrencia optimista. */
	rowVersion?: string;
}

// #endregion
// #region Modelos derivados para la UI

/**
 * Derived course grouping for UI.
 */
export interface ProfesorCurso {
	/** Course id. */
	cursoId: number;
	/** Course name. */
	cursoNombre: string;
	/** Classroom labels. */
	salones: string[];
}

/**
 * Derived classroom grouping for UI.
 */
export interface ProfesorSalon {
	/** Classroom id. */
	salonId: number;
	/** Classroom label. */
	salonDescripcion: string;
	/** Course labels. */
	cursos: string[];
	/** True when professor is tutor. */
	esTutor: boolean;
}
// #endregion