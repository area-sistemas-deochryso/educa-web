/**
 * Asistencia Models - Interfaces que coinciden con el backend educa.API
 * Basado en DTOs/AsistenciaConsultaDto.cs
 */

// Response de una asistencia individual (AsistenciaDetalleDto)
export interface AsistenciaDetalle {
	asistenciaId: number;
	fecha: string;
	sede: string;
	horaEntrada: string | null;
	horaSalida: string | null;
	estado: 'Completa' | 'Incompleta';
	observacion: string | null;
}

// Resumen de asistencias (ResumenAsistenciaDto)
// Response del endpoint GET /api/ConsultaAsistencia/estudiante/mis-asistencias
export interface ResumenAsistencia {
	totalDias: number;
	diasAsistidos: number;
	faltas: number;
	tardanzas: number;
	porcentajeAsistencia: number;
	detalle: AsistenciaDetalle[];
}

// Hijo del apoderado (HijoApoderadoDto)
export interface HijoApoderado {
	estudianteId: number;
	dni: string;
	nombreCompleto: string;
	grado: string;
	seccion: string;
	relacion: string;
}

// Estudiante con asistencias (EstudianteAsistenciaDto) - Para profesor
export interface EstudianteAsistencia {
	estudianteId: number;
	dni: string;
	nombreCompleto: string;
	grado: string;
	seccion: string;
	asistencias: AsistenciaDetalle[];
}

// Estudiante del salón (EstudianteSalonDto)
export interface EstudianteSalon {
	estudianteId: number;
	dni: string;
	nombreCompleto: string;
}

// Salón del profesor (SalonProfesorDto)
export interface SalonProfesor {
	salonId: number;
	grado: string;
	seccion: string;
	nombreSalon: string;
	anio: number;
	esTutor: boolean;
	totalEstudiantes: number;
	estudiantes: EstudianteSalon[];
}

// Estados de asistencia para la UI
export type AttendanceStatus = 'T' | 'A' | 'F' | 'N';

// Director: Estadísticas del día
export interface EstadisticasDia {
	fecha: string;
	totalEstudiantes: number;
	conEntrada: number;
	asistenciasCompletas: number;
	faltas: number;
	porcentajeAsistencia: number;
}

// Director: Grado disponible para filtro
export interface GradoSeccion {
	grado: string;
	seccion: string;
}

// Director: Profesor de la sede
export interface ProfesorSede {
	profesorId: number;
	dni: string;
	nombreCompleto: string;
	salones: string[];
}
