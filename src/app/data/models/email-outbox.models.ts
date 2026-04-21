// #region Tipos semánticos
export const EMAIL_OUTBOX_TIPOS = ['ASISTENCIA', 'ASISTENCIA_CORRECCION', 'OTP', 'NOTIFICACION_FALTAS'] as const;
export type EmailOutboxTipo = (typeof EMAIL_OUTBOX_TIPOS)[number];

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
