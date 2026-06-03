// #region DTOs (BE → FE)
export interface RecipientSummary {
	correo: string;
	outbox: RecipientOutboxSummary;
	blacklist: RecipientBlacklistSummary;
	quarantine: RecipientQuarantineSummary;
	defer: RecipientDeferSummary;
	audit: RecipientAuditSummary;
}

export interface RecipientOutboxSummary {
	total: number;
	fallidos: number;
	ultimoEnvio: string | null;
	ultimoEstado: string | null;
}

export interface RecipientBlacklistSummary {
	activo: boolean;
	motivo: string | null;
	fechaBloqueo: string | null;
}

export interface RecipientQuarantineSummary {
	activo: boolean;
	retryAfter: string | null;
	motivo: string | null;
}

export interface RecipientDeferSummary {
	total7d: number;
	ultimoEvento: string | null;
}

export interface RecipientAuditSummary {
	tieneProblema: boolean;
	tipoFallo: string | null;
}
// #endregion
