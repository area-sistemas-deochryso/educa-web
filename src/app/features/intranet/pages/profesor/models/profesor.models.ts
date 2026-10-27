import type { EstudianteArchivoDto, EstudianteTareaArchivoDto } from '@data/models';
export type { EstudianteArchivoDto, EstudianteTareaArchivoDto } from '@data/models';

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
	/**
	 * Content progress of this slot. Absent when the slot has no active content
	 * (shown as «sin contenido», not «0/0»). Only `mis-horarios` and `horario/profesor/{id}` send it.
	 */
	contenidoResumen?: ContenidoResumenDto;
}

/**
 * Per-slot content summary: weeks with at least one file or task over total weeks.
 */
export interface ContenidoResumenDto {
	/** Total weeks of the slot's content. */
	numeroSemanas: number;
	/** Weeks with at least one file or task. */
	semanasConMaterial: number;
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
	/** Current week (1..numeroSemanas) derived by the backend; absent when it cannot be derived. */
	semanaVigente?: number | null;
}

/** Tipo de material de una semana. */
export type ContenidoArchivoTipo = 'CLASE' | 'COMPLEMENTARIO';

/** Tipo de trabajo para entregar. La modalidad individual/grupal va aparte en `esGrupal`. */
export type ContenidoTareaTipo = 'TAREA' | 'ACTIVIDAD' | 'EXAMEN';

/** Request to publish (visible to students) or unpublish (draft) a week, file or task. */
export interface CambiarPublicacionRequest {
	publicado: boolean;
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
	/** `false` = borrador: los estudiantes no ven la semana. Ausente se trata como publicada. */
	publicado?: boolean;
	/** Primer día de la semana (derivado del inicio del periodo); ausente si no se puede derivar. */
	fechaInicio?: string | null;
	/** Último día de la semana (inclusive). */
	fechaFin?: string | null;
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
	/** CLASE o COMPLEMENTARIO. Ausente se trata como CLASE. */
	tipo?: ContenidoArchivoTipo;
	/** `false` = borrador. Ausente se trata como publicado. */
	publicado?: boolean;
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
	/** Whether this task is group-based. */
	esGrupal: boolean;
	/** Registration date string. */
	fechaReg: string;
	/** Teacher attachments for the task. */
	archivos: TareaArchivoDto[];
	/** TAREA, ACTIVIDAD o EXAMEN. Ausente se trata como TAREA. */
	tipo?: ContenidoTareaTipo;
	/** Duración en minutos (solo exámenes). */
	duracionMinutos?: number | null;
	/** `false` = borrador. Ausente se trata como publicada. */
	publicado?: boolean;
	/** Estudiantes que ya entregaron. Solo viene en la vista docente. */
	entregasRecibidas?: number | null;
	/** Estudiantes activos que deben entregar. Solo viene en la vista docente. */
	entregasEsperadas?: number | null;
	/** Concurrencia optimista. */
	rowVersion?: string;
}

/**
 * Teacher attachment metadata for a task.
 */
export interface TareaArchivoDto {
	id: number;
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
	fechaReg: string;
	/** `false` = borrador: los estudiantes no lo ven. Ausente se trata como publicado. */
	publicado?: boolean;
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
 * Request to register teacher attachment for a task.
 */
export interface RegistrarTareaArchivoRequest {
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
}

/**
 * Student task files grouped by student for professor view.
 */
export interface EstudianteTareaArchivosGroupDto {
	estudianteId: number;
	estudianteNombre: string;
	archivos: EstudianteTareaArchivoDto[];
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
	/** CLASE o COMPLEMENTARIO. El backend asume CLASE si se omite. */
	tipo?: ContenidoArchivoTipo;
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
	/** Whether this task is group-based. */
	esGrupal: boolean;
	/** TAREA, ACTIVIDAD o EXAMEN. El backend asume TAREA si se omite. */
	tipo?: ContenidoTareaTipo;
	/** Duración en minutos; solo se guarda si el tipo es EXAMEN. */
	duracionMinutos?: number | null;
	/** Con el bloque, una sola petición crea la tarea y su evaluación enlazada (INV-C16); solo TAREA y ACTIVIDAD. */
	evaluacion?: CrearTareaEvaluacionRequest;
}

/** Evaluación que se crea junto con la tarea. */
export interface CrearTareaEvaluacionRequest {
	/** Fracción 0,01–1 (la UI muestra %). */
	peso: number;
}

/** Peso ya usado y cupo restante del curso, en fracciones 0–1 (INV-C04). */
export interface CupoPesoDto {
	pesoUsado: number;
	cupoRestante: number;
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
	/** Whether this task is group-based. */
	esGrupal: boolean;
	/** TAREA, ACTIVIDAD o EXAMEN. */
	tipo?: ContenidoTareaTipo;
	/** Duración en minutos; solo se guarda si el tipo es EXAMEN. */
	duracionMinutos?: number | null;
	/** Concurrencia optimista. */
	rowVersion?: string;
}

/**
 * Student files grouped by student.
 */
export interface EstudianteArchivosGroupDto {
	estudianteId: number;
	estudianteNombre: string;
	archivos: EstudianteArchivoDto[];
}

/**
 * Student files grouped by week then student.
 */
export interface SemanaEstudianteArchivosDto {
	semanaId: number;
	numeroSemana: number;
	titulo: string | null;
	estudiantes: EstudianteArchivosGroupDto[];
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
 * Course info inside a salon grouping.
 */
export interface SalonCursoInfo {
	/** Course name. */
	nombre: string;
	/** First horario id for this course-salon pair (used for navigation). */
	horarioId: number;
	/** Course id — the key of the per-course color (`cursoColorFor`). */
	cursoId: number;
}

/**
 * Derived classroom grouping for UI.
 */
export interface ProfesorSalon {
	/** Classroom id. */
	salonId: number;
	/** Classroom label. */
	salonDescripcion: string;
	/** Section letter (e.g. "A", "V"). */
	seccion: string;
	/** Courses with navigation info. */
	cursos: SalonCursoInfo[];
	/** True when professor is tutor. */
	esTutor: boolean;
}

/** Salón enriquecido con datos de estudiantes (vista UI). */
export interface ProfesorSalonConEstudiantes extends ProfesorSalon {
	cantidadEstudiantes: number;
	estudiantes: ProfesorEstudianteSalonDto[];
}
// #endregion

// #region Plazos de Inicio
/** Evaluación cuya ventana de edición INV-T04 cierra en los próximos 7 días (widget de Inicio). */
export interface EvaluacionPorCongelarseDto {
	cursoId?: number | null;
	evaluacionId: number;
	titulo: string;
	cursoNombre: string;
	fechaLimiteEdicion: string;
	horarioId: number;
}
// #endregion
