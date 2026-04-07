// Modelos compartidos para el modulo admin de asistencia diaria.

export interface AsistenciaAdminLista {
	asistenciaId: number;
	estudianteId: number;
	dni: string;
	nombreCompleto: string;
	grado: string;
	seccion: string;
	sede: string;
	sedeId: number;
	fecha: string;
	horaEntrada: string | null;
	horaSalida: string | null;
	estado: 'Completa' | 'Incompleta';
	observacion: string | null;
	origenManual: boolean;
	estadoCodigo: string;
	rowVersion: string;
}

export interface AsistenciaAdminEstadisticas {
	fecha: string;
	totalRegistros: number;
	completas: number;
	incompletas: number;
	registrosManuales: number;
	registrosWebhook: number;
}

export interface CrearEntradaManualRequest {
	estudianteId: number;
	sedeId: number;
	horaEntrada: string;
	observacion?: string;
}

export interface CrearSalidaManualRequest {
	asistenciaId: number;
	horaSalida: string;
	observacion?: string;
}

export interface CrearAsistenciaCompletaRequest {
	estudianteId: number;
	sedeId: number;
	horaEntrada: string;
	horaSalida: string;
	observacion?: string;
}

export interface ActualizarHorasRequest {
	horaEntrada?: string;
	horaSalida?: string;
	observacion?: string;
	rowVersion: string;
}

export interface EstudianteParaSeleccion {
	estudianteId: number;
	dni: string;
	nombreCompleto: string;
	grado: string;
	seccion: string;
	sedeId: number | null;
	sede: string | null;
}

export interface CierreMensualLista {
	cierreId: number;
	sedeId: number;
	sede: string;
	anio: number;
	mes: number;
	fechaCierre: string;
	usuarioCierre: string;
	observacion: string | null;
	activo: boolean;
	rowVersion: string;
}

export interface CrearCierreMensualRequest {
	sedeId: number;
	anio: number;
	mes: number;
	observacion?: string;
}

export interface RevertirCierreMensualRequest {
	observacion: string;
	rowVersion: string;
}

export type TipoOperacionAsistencia = 'entrada' | 'salida' | 'completa';
