/**
 * Plan 37 Chat 3 — DTOs y tipos semánticos del dominio `EmailDeferEvent`.
 * Espejo del DTO BE expuesto por `EmailDeferEventsController`.
 *
 * Plan 37 Chat 117b — el catálogo dinámico de tipos vive ahora en el endpoint
 * `GET /api/sistema/email-outbox/defer-events/tipos` (consumido por
 * `EmailDeferEventsService.getCatalogoTipos()`). El FE no hardcodea valores —
 * el BE es la única fuente de verdad de los `EDE_TipoEvento` válidos.
 */

// #region Semantic types
/** Tipo de evento de defer/bounce. String libre — BE define el catálogo válido. */
export type DeferEventTipo = string;
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
