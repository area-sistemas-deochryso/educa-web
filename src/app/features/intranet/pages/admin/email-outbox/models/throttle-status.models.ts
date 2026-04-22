/**
 * Plan 22 Chat B — espejo FE de los DTOs del endpoint
 * GET /api/sistema/email-outbox/throttle-status.
 *
 * El BE devuelve el email enmascarado (ej: "sistemas@***.com") — el FE
 * lo consume tal cual, no re-enmascara ni reconstruye el address original.
 */
export interface SenderCounter {
	address: string;
	index: number;
	count: number;
	limit: number;
	saturated: boolean;
}

export interface ThrottleStatus {
	senders: SenderCounter[];
	domainCount: number;
	domainLimit: number;
	perSenderLimit: number;
	throttleEnabled: boolean;
	/** Hora Perú (UTC-5) al momento del snapshot, como ISO string. */
	nowUtc: string;
}

/**
 * Niveles de severidad derivados del ratio count/limit. Usados por la UI
 * para elegir el color del tag.
 */
export type ThrottleSeverity = 'success' | 'info' | 'warn' | 'danger';

export function computeSeverity(count: number, limit: number): ThrottleSeverity {
	if (limit <= 0) return 'info';
	const ratio = count / limit;
	if (ratio >= 1) return 'danger';
	if (ratio >= 0.8) return 'warn';
	if (ratio >= 0.5) return 'info';
	return 'success';
}
