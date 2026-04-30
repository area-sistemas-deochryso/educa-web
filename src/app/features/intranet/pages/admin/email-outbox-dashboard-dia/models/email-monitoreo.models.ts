/**
 * Plan 39 Chat C — espejo FE de los DTOs del dashboard de monitoreo de correos.
 * BE: Educa.API/DTOs/Notifications/Monitoreo/.
 *
 * Endpoints (todos bajo `/api/sistema/email-outbox/monitoreo/`):
 *  - sender-stats         → DashboardSenderStat[]
 *  - top-destinatarios    → DashboardTopDestinatario[]
 *  - serie-temporal       → DashboardSerieTemporalPunto[]
 *  - dominios-receptores  → DashboardDominioReceptor[]
 *  - candidatos-blacklist → DashboardCandidatoBlacklist[]
 *
 * Caps defensivos del BE: ventanaDias <= 30, limit <= 50, ventanaHoras <= 720.
 * Defaults `candidatos-blacklist` se inyectan desde EmailSettings.MailboxFullThreshold*.
 */

export interface DashboardSenderStat {
	remitente: string;
	total: number;
	enviados: number;
	fallidos: number;
	pendientes: number;
	ultimoUso: string;
	tasaFalloPct: number;
}

export interface DashboardTopDestinatario {
	destinatario: string;
	hitsFallidos: number;
	diasConFalla: number;
	mailboxFull: number;
	otros5xx: number;
	yaBlacklisteado: boolean;
}

export interface DashboardSerieTemporalPunto {
	bucket: string;
	enviados: number;
	fallidos: number;
	bloqueadosPorCuota: number;
}

export interface DashboardDominioReceptor {
	dominio: string;
	total: number;
	fallidos: number;
	tasaFalloPct: number;
}

export interface DashboardCandidatoBlacklist {
	destinatario: string;
	hits: number;
	ultimoHit: string;
}

export type SerieTemporalGranularidad = 'hour' | 'day';

export interface MapaEnvioFilters {
	ventanaDias: number;
	granularidad: SerieTemporalGranularidad;
	topLimit: number;
}

export const MAPA_ENVIO_DEFAULTS: MapaEnvioFilters = {
	ventanaDias: 7,
	granularidad: 'hour',
	topLimit: 10,
};

/**
 * Plan 39 Chat B — payloads de los 3 eventos del EmailHub.
 * Hub server-side: `/hubs/email-alerts`. Auth: roles administrativos.
 */
export interface BlacklistEntryCreatedEvent {
	correoEnmascarado: string;
	motivo: string;
	origen: string;
}

export interface DeferFailStatusUpdatedEvent {
	status: 'OK' | 'WARNING' | 'CRITICAL';
	contadorActual: number;
	threshold: number;
}

export interface CandidatoBlacklistDetectadoEvent {
	correoEnmascarado: string;
	hitsActuales: number;
	thresholdHits: number;
}
