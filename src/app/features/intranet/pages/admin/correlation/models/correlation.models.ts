// #region DTOs (espejo del backend Plan 32 Chat 3)
/**
 * Plan 32 Chat 3 — fila de ErrorLog dentro del snapshot por CorrelationId.
 * DNI ya viene enmascarado upstream — NO aplicar Mask() adicional.
 * Mensaje truncado a 200 chars en BE.
 */
export interface CorrelationErrorLogDto {
	id: number;
	severidad: string;
	mensaje: string;
	url: string;
	httpMethod: string | null;
	httpStatus: number | null;
	errorCode: string | null;
	usuarioDniMasked: string | null;
	usuarioRol: string | null;
	plataforma: string;
	fecha: string;
}

/**
 * Fila de RateLimitEvent dentro del snapshot. DNI enmascarado upstream.
 * IP omitida por privacidad — el dashboard rate-limit-events ya la muestra.
 */
export interface CorrelationRateLimitEventDto {
	id: number;
	endpoint: string;
	httpMethod: string;
	policy: string | null;
	usuarioDniMasked: string | null;
	usuarioRol: string | null;
	limiteEfectivo: number | null;
	tokensConsumidos: number | null;
	fueRechazado: boolean;
	fecha: string;
}

/**
 * Fila de REU_ReporteUsuario. Reportes anónimos (INV-RU05) llegan con
 * usuarioDniMasked null. Descripción y propuesta truncadas a 200 chars.
 */
export interface CorrelationReporteUsuarioDto {
	id: number;
	tipo: string;
	descripcionResumen: string;
	propuestaResumen: string | null;
	url: string;
	estado: string;
	plataforma: string;
	usuarioDniMasked: string | null;
	usuarioRol: string | null;
	usuarioNombre: string | null;
	fechaReg: string;
}

/**
 * Fila de EmailOutbox (sin EO_CuerpoHtml). Destinatario enmascarado upstream.
 * UltimoErrorResumen truncado a 200 chars.
 */
export interface CorrelationEmailOutboxDto {
	id: number;
	tipo: string;
	estado: string;
	destinatarioMasked: string;
	asunto: string;
	entidadOrigen: string | null;
	entidadId: number | null;
	intentos: number;
	ultimoErrorResumen: string | null;
	tipoFallo: string | null;
	fechaEnvio: string | null;
	fechaReg: string;
}

/**
 * Snapshot agregado de los 4 tipos de evento que comparten un CorrelationId.
 * Cada lista es independiente — el BE deja vacía la sección que falle (INV-S07)
 * y devuelve las 4 igualmente. Cap defensivo de 100 filas por sección.
 */
export interface CorrelationSnapshot {
	correlationId: string;
	generatedAt: string;
	errorLogs: CorrelationErrorLogDto[];
	rateLimitEvents: CorrelationRateLimitEventDto[];
	reportesUsuario: CorrelationReporteUsuarioDto[];
	emailOutbox: CorrelationEmailOutboxDto[];
}
// #endregion

// #region Helpers de UI
export const SEVERIDAD_SEVERITY_MAP: Record<string, 'danger' | 'warn' | 'info'> = {
	CRITICAL: 'danger',
	ERROR: 'warn',
	WARNING: 'info',
};

export const REPORTE_ESTADO_SEVERITY_MAP: Record<string, 'info' | 'warn' | 'success' | 'secondary'> = {
	NUEVO: 'info',
	REVISADO: 'warn',
	EN_PROGRESO: 'warn',
	RESUELTO: 'success',
	DESCARTADO: 'secondary',
};

export const OUTBOX_ESTADO_SEVERITY_MAP: Record<string, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
	PENDING: 'info',
	SENT: 'success',
	RETRYING: 'warn',
	FAILED: 'danger',
	FAILED_BLACKLISTED: 'danger',
};

/** Cap defensivo del BE — si una sección llega con 100 filas, mostrar nota informativa. */
export const SECTION_DEFENSIVE_CAP = 100;
// #endregion
