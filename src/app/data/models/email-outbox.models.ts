// #region Tipos semánticos
// `ASISTENCIA_CORRECCION_PROFESOR` (Plan 23 Chat 4 BE) y
// `ASISTENCIA_CORRECCION_ASISTENTE_ADMIN` (Plan 28 Chat 3b BE) emiten correos
// diferenciados por TipoPersona. INV-AD05 ampliado.
export const EMAIL_OUTBOX_TIPOS = [
	'ASISTENCIA',
	'ASISTENCIA_CORRECCION',
	'ASISTENCIA_CORRECCION_PROFESOR',
	'ASISTENCIA_CORRECCION_ASISTENTE_ADMIN',
	'OTP',
	'NOTIFICACION_FALTAS',
] as const;
export type EmailOutboxTipo = (typeof EMAIL_OUTBOX_TIPOS)[number];

/** Label humano para el filtro/tag — strings largos del BE se acortan. */
export const EMAIL_OUTBOX_TIPO_LABELS: Record<EmailOutboxTipo, string> = {
	ASISTENCIA: 'Asistencia',
	ASISTENCIA_CORRECCION: 'Corrección (estudiante)',
	ASISTENCIA_CORRECCION_PROFESOR: 'Corrección (profesor)',
	ASISTENCIA_CORRECCION_ASISTENTE_ADMIN: 'Corrección (asist. admin.)',
	OTP: 'OTP',
	NOTIFICACION_FALTAS: 'Notificación de faltas',
};

export const EMAIL_OUTBOX_ESTADOS = ['PENDING', 'PROCESSING', 'SENT', 'FAILED'] as const;
export type EmailOutboxEstado = (typeof EMAIL_OUTBOX_ESTADOS)[number];
// #endregion

// #region Response DTOs (API → Frontend)
export interface EmailOutboxLista {
	id: number;
	tipo: EmailOutboxTipo;
	estado: EmailOutboxEstado;
	destinatario: string;
	asunto: string;
	entidadOrigen: string | null;
	entidadId: number | null;
	intentos: number;
	maxIntentos: number;
	ultimoError: string | null;
	tipoFallo: string | null;
	fechaEnvio: string | null;
	duracionMs: number | null;
	usuarioReg: string;
	fechaReg: string;
	/** Plan 32 Chat 2 BE — id de correlación inyectado en el outbox para tracing cross-fuente. */
	correlationId: string | null;
}

export interface EmailOutboxEstadisticas {
	total: number;
	enviados: number;
	fallidos: number;
	pendientes: number;
	enProceso: number;
	porcentajeExito: number;
}

export interface EmailOutboxTendencia {
	fecha: string;
	enviados: number;
	fallidos: number;
	pendientes: number;
	total: number;
}
// #endregion
