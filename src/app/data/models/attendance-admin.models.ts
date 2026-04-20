// Modelos compartidos para el modulo admin de asistencia diaria.

export type TipoPersonaAsistencia = 'E' | 'P';
export type TipoPersonaFilter = TipoPersonaAsistencia | 'todos';

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
	editadoManualmente: boolean;
	estadoCodigo: string;
	rowVersion: string;
	tipoPersona: TipoPersonaAsistencia;
	contextoPersona: string;
}

export interface AsistenciaAdminEstadisticas {
	fecha: string;
	totalRegistros: number;
	completas: number;
	incompletas: number;
	registrosManuales: number;
	registrosWebhook: number;
	totalEstudiantes: number;
	totalProfesores: number;
	completasEstudiantes: number;
	completasProfesores: number;
}

export interface CrearEntradaManualRequest {
	estudianteId: number;
	sedeId: number;
	horaEntrada: string;
	observacion?: string;
	tipoPersona?: TipoPersonaAsistencia;
}

export interface CrearSalidaManualRequest {
	asistenciaId: number;
	horaSalida: string;
	observacion?: string;
	tipoPersona?: TipoPersonaAsistencia;
}

export interface CrearAsistenciaCompletaRequest {
	estudianteId: number;
	sedeId: number;
	horaEntrada: string;
	horaSalida: string;
	observacion?: string;
	tipoPersona?: TipoPersonaAsistencia;
}

export interface ActualizarHorasRequest {
	horaEntrada?: string;
	horaSalida?: string;
	limpiarSalida?: boolean;
	observacion?: string;
	rowVersion: string;
	tipoPersona?: TipoPersonaAsistencia;
}

export interface PersonaParaSeleccion {
	estudianteId: number;
	dni: string;
	nombreCompleto: string;
	grado: string;
	seccion: string;
	sedeId: number | null;
	sede: string | null;
	tipoPersona: TipoPersonaAsistencia;
	contextoPersona: string;
}

/** Alias retrocompat — mantiene nombre viejo mientras se migra el resto del código. */
export type EstudianteParaSeleccion = PersonaParaSeleccion;

export interface SincronizarTipoResultado {
	nuevos: number;
	preservados: number;
	errores: number;
}

export interface SincronizarResultado {
	mensaje: string;
	estudiantes: SincronizarTipoResultado;
	profesores: SincronizarTipoResultado;
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

export interface EnviarCorreosAsistenciaRequest {
	asistenciaIds: number[];
}

export interface EnviarCorreosResultado {
	total: number;
	encolados: number;
	sinCorreo: number;
	noEncontrados: number;
}
