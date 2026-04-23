/**
 * Plan 22 Chat B (FE) / Plan 29 Chat 2.6 (BE) — espejo FE del DTO
 * GET /api/sistema/email-outbox/defer-fail-status.
 *
 * El BE mide el techo cPanel (defers+fails/hora/dominio) para que el admin
 * pueda reaccionar ANTES de que hosting bloquee el dominio entero.
 *
 * Semáforo calculado en backend (`DeferFailStatusLevel`):
 *  • OK       — percentUsed < 60
 *  • WARNING  — 60 ≤ percentUsed < 100
 *  • CRITICAL — percentUsed ≥ 100 (cPanel bloqueando)
 */
export type DeferFailStatusLevel = 'OK' | 'WARNING' | 'CRITICAL';

/**
 * Contador de la hora actual vs techo configurable
 * `EmailSettings.DeferFailThresholdPerHour` (default 5).
 *
 * Solo cuenta correos que cruzaron al SMTP y rebotaron sincrónicamente.
 * Excluye FAILED_INVALID_ADDRESS, FAILED_NO_EMAIL, FAILED_BLACKLISTED
 * porque NO consumen quota del dominio.
 */
export interface DeferFailCurrentHourStatus {
	deferFailCount: number;
	threshold: number;
	percentUsed: number;
	/** ISO hora Perú (UTC-5) del piso de la hora — ej "2026-04-23T09:00:00". */
	hourStart: string;
}

/**
 * Breakdown 24h por estado + tipo de fallo. Consume EmailOutbox.
 * Los 3 tipos "no cuentan para cPanel" (invalid/noEmail/blacklisted) se
 * muestran con estilo informativo distinto al resto.
 */
export interface DeferFailWindowStats {
	total: number;
	sent: number;
	pending: number;
	retrying: number;
	failedInvalidAddress: number;
	failedNoEmail: number;
	failedBlacklisted: number;
	failedThrottleHost: number;
	/** Catch-all: FAILED_UNKNOWN, FAILED_MAILBOX_FULL, FAILED_REJECTED, etc. */
	failedOther: number;
}

/**
 * Resumen de la tabla EmailBlacklist — solo registros con EBL_Estado=true.
 * Motivos válidos según CHECK constraint BD: BOUNCE_5XX, MANUAL, BULK_IMPORT,
 * FORMAT_INVALID.
 */
export interface DeferFailBlacklistSummary {
	totalActivos: number;
	byReasonBounce5xx: number;
	byReasonManual: number;
	byReasonBulkImport: number;
	byReasonFormatInvalid: number;
	/** ISO o null si no hay activos. */
	oldestEntry: string | null;
	/** ISO o null si no hay activos. */
	newestEntry: string | null;
}

export interface DeferFailStatus {
	status: DeferFailStatusLevel;
	currentHour: DeferFailCurrentHourStatus;
	last24h: DeferFailWindowStats;
	blacklist: DeferFailBlacklistSummary;
	/** Hora Perú (UTC-5) al momento del snapshot, como ISO string. */
	generatedAt: string;
}

/**
 * Heurística fail-safe: backend devolvió CRITICAL con todos los counters en 0
 * es casi seguro un error interno del service (cayó al try/catch global
 * INV-S07). La UI puede mostrar banner sutil "error de telemetría".
 */
export function isProbableTelemetryFailure(status: DeferFailStatus | null): boolean {
	if (!status) return false;
	if (status.status !== 'CRITICAL') return false;
	const h = status.currentHour;
	const w = status.last24h;
	const b = status.blacklist;
	return (
		h.deferFailCount === 0 &&
		w.total === 0 &&
		w.sent === 0 &&
		w.retrying === 0 &&
		w.failedThrottleHost === 0 &&
		w.failedOther === 0 &&
		b.totalActivos === 0
	);
}
