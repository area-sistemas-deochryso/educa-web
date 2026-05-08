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
