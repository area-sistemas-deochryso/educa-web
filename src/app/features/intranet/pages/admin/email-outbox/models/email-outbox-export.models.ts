export interface EmailOutboxExportDto {
	outbox: EmailOutboxDetalleDto;
	deferEvents: EmailDeferEventExportItem[];
	blacklist: EmailBlacklistExportItem | null;
	quarantine: EmailQuarantineExportItem | null;
	correlationEvents: EmailCorrelationEventsDto | null;
}

export interface EmailOutboxDetalleDto {
	id: number;
	tipo: string;
	estado: string;
	tipoFallo: string | null;
	destinatario: string;
	asunto: string;
	intentos: number;
	maxIntentos: number;
	ultimoError: string | null;
	ultimoErrorTransiente: string | null;
	correlationId: string;
	fechaEnvio: string | null;
	fechaReg: string;
	duracionMs: number | null;
	usuarioReg: string;
}

export interface EmailDeferEventExportItem {
	id: number;
	tipoEvento: string;
	destinatario: string | null;
	dominioReceptor: string | null;
	statusCode: string | null;
	diagnosticCode: string | null;
	detectado: string;
	fecha: string;
}

export interface EmailBlacklistExportItem {
	id: number;
	correo: string;
	motivoBloqueo: string;
	intentosFallidos: number;
	ultimoError: string | null;
	originalSmtpResponse: string | null;
	estado: boolean;
	fechaPrimerFallo: string | null;
	fechaUltimoFallo: string | null;
	fechaReg: string;
}

export interface EmailQuarantineExportItem {
	id: number;
	destinatario: string;
	motivo: string;
	retryAfter: string;
	quarantineCount: number;
	estado: boolean;
	originalSmtpResponse: string | null;
	motivoLiberacion: string | null;
	fechaReg: string;
}

export interface EmailCorrelationEventsDto {
	correlationId: string;
	errorLogs: ErrorLogExportItem[];
	rateLimitEvents: RateLimitEventExportItem[];
	reportesUsuario: ReporteUsuarioExportItem[];
}

export interface ErrorLogExportItem {
	id: number;
	origen: string;
	severidad: string;
	mensaje: string;
	url: string;
	httpMethod: string | null;
	httpStatus: number | null;
	errorCode: string | null;
	fecha: string;
}

export interface RateLimitEventExportItem {
	id: number;
	endpoint: string;
	httpMethod: string;
	policy: string | null;
	fueRechazado: boolean;
	fecha: string;
}

export interface ReporteUsuarioExportItem {
	id: number;
	tipo: string | null;
	descripcion: string | null;
	fecha: string;
}
