// #region Tipos del dominio (3 tabs)
export type DomainId = 'correos' | 'incidencias' | 'seguridad';
export type DomainTone = 'blue' | 'red' | 'amber' | 'green';
// #endregion

// #region Tipos del badge por sub-link del hub Monitoreo
export type BadgeLevel = 'ok' | 'warn' | 'critical' | 'unknown';

export interface LinkBadge {
	/** `null` cuando la métrica no se pudo cargar (fail-safe INV-S07) o aún no llegó. */
	count: number | null;
	level: BadgeLevel;
	/** Texto descriptivo para `aria-label` y tooltip. */
	label: string;
}

export type HubBadgeKey =
	| 'bandeja'
	| 'dashboard'
	| 'diagnostico'
	| 'blacklist'
	| 'errores'
	| 'reportes'
	| 'rateLimit';

export type HubBadges = Record<HubBadgeKey, LinkBadge> & { loading: boolean };

// #region Stat strip — datos visuales prominentes por card
export interface StatPoint {
	label: string;
	value: string | number;
	level?: BadgeLevel;
}

export interface CardSummary {
	/** Métrica destacada en grande (ej: "14"). */
	headline: string | number;
	/** Texto pequeño bajo el headline (ej: "pendientes o fallidos hoy"). */
	headlineLabel: string;
	/** Nivel del headline → color del número. */
	headlineLevel: BadgeLevel;
	/** Hasta 3 stats secundarios en strip horizontal. */
	stats: StatPoint[];
}

export interface HubDeltas {
	bandeja: number | null;
	errores: number | null;
}

/** Datos crudos de las métricas; el componente los proyecta a `CardSummary` por card. */
export interface HubExtras {
	outbox: {
		total: number;
		enviados: number;
		pendientes: number;
		fallidos: number;
		/** Plan 43 Chat 1.1 — origen del contador para chip UI. */
		source?: string;
		/** Plan 43 Chat 1.1 — etiqueta legible de la ventana. */
		timeWindowLabel?: string;
	} | null;
	deferFail: {
		current: number;
		threshold: number;
		percentUsed: number;
		blacklistActivos: number;
		last24hTotal: number;
		last24hSent: number;
		last24hFailedOther: number;
		/** Plan 43 Chat 1.1 — origen del contador para chip UI. */
		source?: string;
		/** Plan 43 Chat 1.1 — etiqueta legible de la ventana 24h. */
		timeWindowLabel?: string;
	} | null;
	candidatosBlacklist: number | null;
	errorsNuevos: number | null;
	reportesNuevos: number | null;
	reportesEnProgreso: number | null;
	rateLimitRechazados: number | null;
	deltas: HubDeltas | null;
}

export function initialHubExtras(): HubExtras {
	return {
		outbox: null,
		deferFail: null,
		candidatosBlacklist: null,
		errorsNuevos: null,
		reportesNuevos: null,
		reportesEnProgreso: null,
		rateLimitRechazados: null,
		deltas: null,
	};
}
// #endregion

export const UNKNOWN_BADGE: LinkBadge = {
	count: null,
	level: 'unknown',
	label: 'Sin datos',
};

export function initialHubBadges(): HubBadges {
	return {
		bandeja: UNKNOWN_BADGE,
		dashboard: UNKNOWN_BADGE,
		diagnostico: UNKNOWN_BADGE,
		blacklist: UNKNOWN_BADGE,
		errores: UNKNOWN_BADGE,
		reportes: UNKNOWN_BADGE,
		rateLimit: UNKNOWN_BADGE,
		loading: false,
	};
}
// #endregion
