import { HttpContextToken } from '@angular/common/http';

// #region Constantes
/** Tamaño del buffer circular en memoria (ADR-0008). */
export const BREADCRUMB_BUFFER_SIZE = 50;

/** Máximo de envíos por ventana, por debajo del rate limit del BE (10/min por IP). */
export const BREADCRUMB_MAX_SENDS_PER_MINUTE = 3;

export const BREADCRUMB_SEND_WINDOW_MS = 60_000;

/** Estados 4xx que NO disparan envío: son flujo esperado del usuario, no un incidente. */
export const BREADCRUMB_IGNORED_4XX = [401, 403, 404, 409, 422, 429] as const;

/**
 * Marca el POST de ingesta para que ni el interceptor de trace (no lo captura en el
 * buffer) ni el de errores (no lo reporta ni muestra toast) lo procesen: así el
 * envío no puede dispararse a sí mismo.
 */
export const SKIP_BREADCRUMBS = new HttpContextToken<boolean>(() => false);
// #endregion

// #region Tipos
export type BreadcrumbEventTipo = 'navigation' | 'http' | 'error';

/** Evento del buffer. `at` es reloj local; al enviar se convierte a `offsetMs`. */
export interface BreadcrumbEvent {
	tipo: BreadcrumbEventTipo;
	at: number;
	ruta: string;
	metodo?: string;
	statusCode?: number;
	errorClass?: string;
}

/** Evento tal como lo espera `POST /api/sistema/breadcrumbs` (contrato 848). */
export interface BreadcrumbIngestEvent {
	tipo: BreadcrumbEventTipo;
	offsetMs: number;
	ruta: string;
	metodo?: string;
	statusCode?: number;
	errorClass?: string;
}

export interface BreadcrumbIngestPayload {
	correlationId: string;
	sessionId: string;
	events: BreadcrumbIngestEvent[];
}
// #endregion
