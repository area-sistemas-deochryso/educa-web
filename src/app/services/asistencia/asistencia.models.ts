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

// Estados de asistencia para la UI
export type AttendanceStatus = 'T' | 'A' | 'F' | 'N';
