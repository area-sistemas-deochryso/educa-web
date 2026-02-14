/**
 * Asistencia Models - Interfaces que coinciden con el backend educa.API
 * Basado en DTOs/AsistenciaConsultaDto.cs
 */
// * Attendance DTOs used by asistencia services.

// Response de una asistencia individual (AsistenciaDetalleDto)
export interface AsistenciaDetalle {
	asistenciaId: number;
	fecha: string;
	sede: string;
	horaEntrada: string | null;
	horaSalida: string | null;
	estado: 'Completa' | 'Incompleta';
	observacion: string | null;

	// Estados calculados (agregados para mover lÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³gica al backend)
	estadoCodigo: AttendanceStatus;
	estadoDescripcion: string;
	puedeJustificar: boolean;
	esJustificado: boolean;

	// Estados separados para tablas de ingreso/salida
	estadoIngreso: AttendanceStatus;
	estadoSalida: AttendanceStatus;
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

// Estudiante del salÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n (EstudianteSalonDto)
export interface EstudianteSalon {
	estudianteId: number;
	dni: string;
	nombreCompleto: string;
}

// SalÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n del profesor (SalonProfesorDto)
export interface SalonProfesor {
	salonId: number;
	grado: string;
	gradoCodigo: string;
	seccion: string;
	nombreSalon: string;
	anio: number;
	esTutor: boolean;
	totalEstudiantes: number;
	estudiantes: EstudianteSalon[];
}

// Estados de asistencia para la UI
// T = Temprano, A = A tiempo, F = Fuera de hora, N = No asistiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³
// J = Justificado, - = Pendiente, X = Antes del registro
export type AttendanceStatus = 'T' | 'A' | 'F' | 'N' | 'J' | '-' | 'X';

// Director: EstadÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­sticas del dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a
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
	gradoCodigo: string;
	seccion: string;
}

// Director: Profesor de la sede
export interface ProfesorSede {
	profesorId: number;
	dni: string;
	nombreCompleto: string;
	salones: string[];
}

// Estados vÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lidos de asistencia para leyenda
export interface EstadoAsistencia {
	codigo: AttendanceStatus;
	descripcion: string;
}

// #region EstadÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­sticas de asistencia del dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a

/**
 * EstadÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­sticas de asistencia calculadas en el backend
 * Contiene los contadores de cada estado de asistencia
 */
export interface EstadisticasAsistenciaDia {
	total: number;
	temprano: number;
	aTiempo: number;
	fueraHora: number;
	noAsistio: number;
	justificado: number;
	pendiente: number;
}

/**
 * Respuesta del endpoint de asistencia del dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a con estadÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­sticas incluidas
 * GET /api/ConsultaAsistencia/profesor/asistencia-dia
 * GET /api/ConsultaAsistencia/director/asistencia-dia
 */
export interface AsistenciaDiaConEstadisticas {
	estudiantes: EstudianteAsistencia[];
	estadisticas: EstadisticasAsistenciaDia;
}
// #endregion
