/**
 * Plan 37 Chat 3 — DTOs y tipos semánticos del dominio `EmailRecipientDomainPause`.
 * Espejo del DTO BE expuesto por `EmailDomainPausesController`.
 */

// #region Semantic types
export const EMAIL_DOMAIN_PAUSE_MOTIVOS = [
	'DEFER_BURST',
	'DOMAIN_BLOCKED_NDR',
	'MANUAL',
] as const;
export type DomainPauseMotivo = (typeof EMAIL_DOMAIN_PAUSE_MOTIVOS)[number];

export const EMAIL_DOMAIN_PAUSE_MOTIVOS_MANUALES: readonly DomainPauseMotivo[] = ['MANUAL'];

export const EMAIL_DOMAIN_PAUSE_ESTADOS = ['activa', 'liberada', 'todas'] as const;
export type EmailDomainPauseFiltroEstado = (typeof EMAIL_DOMAIN_PAUSE_ESTADOS)[number];

/** Duraciones permitidas en horas para pauses manuales. */
export const DOMAIN_PAUSE_DURATION_HOURS_OPTIONS = [1, 6, 12, 24] as const;
export type DomainPauseDurationHours = (typeof DOMAIN_PAUSE_DURATION_HOURS_OPTIONS)[number];
// #endregion

// #region DTOs
export interface EmailDomainPauseListaDto {
	id: number;
	dominio: string;
	motivo: DomainPauseMotivo;
	triggerEventCount: number;
	pausedUntil: string;
	estado: boolean;
	observacion: string | null;
	fechaReg: string;
	fechaMod: string | null;
	usuarioReg: string;
	usuarioMod: string | null;
	rowVersion: string;
}
// #endregion

// #region Requests
export interface CrearEmailDomainPauseDto {
	dominio: string;
	motivo: DomainPauseMotivo;
	durationHours: DomainPauseDurationHours;
	observacion: string;
}

export interface LiberarEmailDomainPauseDto {
	rowVersion: string;
	observacion: string;
}
// #endregion

// #region UI shapes
export interface EmailDomainPauseFormData {
	dominio: string;
	motivo: DomainPauseMotivo | null;
	durationHours: DomainPauseDurationHours;
	observacion: string;
}

export interface EmailDomainPauseEstadisticas {
	total: number;
	activas: number;
	liberadas: number;
}
// #endregion
