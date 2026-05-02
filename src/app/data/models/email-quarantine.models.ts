/**
 * Plan 37 Chat 3 — DTOs y tipos semánticos del dominio `EmailQuarantine`.
 * Espejo del DTO BE expuesto por `EmailQuarantineController`
 * (`Educa.API/Controllers/Sistema/EmailQuarantineController.cs`).
 */

// #region Semantic types
/**
 * Motivos válidos de cuarentena. Alineado con el enum BE
 * `EmailQuarantineMotivos.cs` y con el CHECK constraint `CK_EmailQuarantine_Motivo`.
 */
export const EMAIL_QUARANTINE_MOTIVOS = [
	'MAILBOX_FULL',
	'SOFT_BOUNCE_REPEATED',
	'DELAY_72H',
	'MANUAL',
] as const;
export type QuarantineMotivo = (typeof EMAIL_QUARANTINE_MOTIVOS)[number];

/** Motivos que el admin puede elegir manualmente desde el dialog. */
export const EMAIL_QUARANTINE_MOTIVOS_MANUALES: readonly QuarantineMotivo[] = ['MANUAL'];

/** Filtro estado del listado (`activa` ⇒ `EQU_Estado=true && EQU_RetryAfter > now`). */
export const EMAIL_QUARANTINE_ESTADOS = ['activa', 'liberada', 'todas'] as const;
export type EmailQuarantineFiltroEstado = (typeof EMAIL_QUARANTINE_ESTADOS)[number];

/**
 * Motivos canónicos al liberar manualmente. El BE no los enforza,
 * pero documenta la intención del admin.
 */
export const EMAIL_QUARANTINE_LIBERACION_MOTIVOS = [
	'CONTACTO_DIRECTO',
	'BUZON_LIBERADO',
	'FALSO_POSITIVO',
	'OTRO',
] as const;
export type MotivoLiberacion = (typeof EMAIL_QUARANTINE_LIBERACION_MOTIVOS)[number];

/** Duraciones permitidas en horas para cuarentenas manuales. */
export const QUARANTINE_DURATION_HOURS_OPTIONS = [24, 48, 72] as const;
export type QuarantineDurationHours = (typeof QUARANTINE_DURATION_HOURS_OPTIONS)[number];
// #endregion

// #region DTOs (BE → FE)
export interface EmailQuarantineListaDto {
	id: number;
	destinatario: string;
	motivo: QuarantineMotivo;
	quarantineCount: number;
	retryAfter: string;
	estado: boolean;
	observacion: string | null;
	fechaReg: string;
	fechaMod: string | null;
	usuarioReg: string;
	usuarioMod: string | null;
	rowVersion: string;
}

export interface EmailQuarantineDetalleDto extends EmailQuarantineListaDto {
	eventoOrigenId: number | null;
	eventoOrigenTipo: string | null;
	eventoOrigenDiagnostic: string | null;
	historial: EmailQuarantineListaDto[];
}
// #endregion

// #region Requests (FE → BE)
export interface CrearEmailQuarantineDto {
	destinatario: string;
	motivo: QuarantineMotivo;
	durationHours: QuarantineDurationHours;
	observacion: string;
}

export interface LiberarEmailQuarantineDto {
	rowVersion: string;
	motivoLiberacion: MotivoLiberacion;
	observacion: string;
}
// #endregion

// #region UI shapes
export interface EmailQuarantineFormData {
	destinatario: string;
	motivo: QuarantineMotivo | null;
	durationHours: QuarantineDurationHours;
	observacion: string;
}

export interface EmailQuarantineFiltros {
	estado: EmailQuarantineFiltroEstado | null;
	motivo: QuarantineMotivo | null;
	q: string | null;
}

export interface EmailQuarantineEstadisticas {
	total: number;
	activas: number;
	liberadas: number;
}
// #endregion
