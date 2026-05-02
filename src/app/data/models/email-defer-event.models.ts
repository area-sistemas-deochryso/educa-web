/**
 * Plan 37 Chat 3 — DTOs y tipos semánticos del dominio `EmailDeferEvent`.
 * Espejo del DTO BE expuesto por `EmailDeferEventsController`.
 *
 * Tipos derivados de `Constants/Notifications/EmailDeferEventTipos.cs`.
 */

// #region Semantic types
export const EMAIL_DEFER_EVENT_TIPOS = [
	'DEFER_4XX',
	'BOUNCE_5XX',
	'MAILBOX_FULL',
	'DOMAIN_BLOCKED',
	'AUTH_FAILURE',
	'TLS_FAILURE',
	'TIMEOUT',
	'OTHER',
] as const;
export type DeferEventTipo = (typeof EMAIL_DEFER_EVENT_TIPOS)[number];
// #endregion

// #region DTOs
export interface EmailDeferEventDto {
	id: number;
	fecha: string;
	tipo: DeferEventTipo;
	destinatario: string | null;
	dominio: string | null;
	statusCode: string | null;
	diagnosticCode: string | null;
	emailOutboxId: number | null;
	correlationId: string | null;
}
// #endregion

// #region Filters
export interface EmailDeferEventFiltros {
	desde: string | null;
	hasta: string | null;
	tipo: DeferEventTipo | null;
	dominio: string | null;
}
// #endregion
