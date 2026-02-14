// #region DTOs del backend

export interface HorarioProfesorDto {
	id: number;
	diaSemana: number;
	diaSemanaDescripcion: string;
	horaInicio: string;
	horaFin: string;
	estado: boolean;
	salonId: number;
	salonDescripcion: string;
	cursoId: number;
	cursoNombre: string;
	profesorId: number | null;
	profesorNombreCompleto: string | null;
	cantidadEstudiantes: number;
}

export interface SalonTutoriaResponse {
	mensaje: string;
	data: SalonTutoriaDto | null;
}

export interface SalonTutoriaDto {
	profesorSalonId: number;
	profesorId: number;
	salonId: number;
	salonNombre: string;
	grado: string;
	seccion: string;
	esTutor: boolean;
	estado: boolean;
}

// #endregion
// #region DTOs de mis-estudiantes

export interface ProfesorMisSalonesConEstudiantesDto {
	salones: ProfesorSalonConEstudiantesDto[];
	totalEstudiantes: number;
	totalSalones: number;
}

export interface ProfesorSalonConEstudiantesDto {
	salonId: number;
	grado: string;
	seccion: string;
	nombreSalon: string;
	anio: number;
	esTutor: boolean;
	cantidadEstudiantes: number;
	estudiantes: ProfesorEstudianteSalonDto[];
}

export interface ProfesorEstudianteSalonDto {
	estudianteId: number;
	dni: string;
	nombreCompleto: string;
}

// #endregion
// #region DTOs de curso-contenido

export interface CursoContenidoDetalleDto {
	id: number;
	horarioId: number;
	numeroSemanas: number;
	estado: boolean;
	cursoNombre: string;
	salonDescripcion: string;
	semanas: CursoContenidoSemanaDto[];
}

export interface CursoContenidoSemanaDto {
	id: number;
	numeroSemana: number;
	titulo: string | null;
	descripcion: string | null;
	mensajeDocente: string | null;
	archivos: CursoContenidoArchivoDto[];
	tareas: CursoContenidoTareaDto[];
}

export interface CursoContenidoArchivoDto {
	id: number;
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
	fechaReg: string;
}

export interface CursoContenidoTareaDto {
	id: number;
	titulo: string;
	descripcion: string | null;
	fechaLimite: string | null;
	fechaReg: string;
}

export interface CrearCursoContenidoRequest {
	horarioId: number;
	numeroSemanas: number;
}

export interface ActualizarSemanaRequest {
	titulo: string | null;
	descripcion: string | null;
	mensajeDocente: string | null;
}

export interface RegistrarArchivoRequest {
	nombreArchivo: string;
	urlArchivo: string;
	tipoArchivo: string | null;
	tamanoBytes: number | null;
}

export interface CrearTareaRequest {
	titulo: string;
	descripcion: string | null;
	fechaLimite: string | null;
}

export interface ActualizarTareaRequest {
	titulo: string;
	descripcion: string | null;
	fechaLimite: string | null;
}

// #endregion
// #region Modelos derivados para la UI

export interface ProfesorCurso {
	cursoId: number;
	cursoNombre: string;
	salones: string[];
}

export interface ProfesorSalon {
	salonId: number;
	salonDescripcion: string;
	cursos: string[];
	esTutor: boolean;
}
// #endregion
