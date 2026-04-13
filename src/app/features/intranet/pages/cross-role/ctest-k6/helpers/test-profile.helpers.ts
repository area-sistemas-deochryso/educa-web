/** Parsea "30s", "1m", "5m", "1h" a segundos */
export function parseDurationToSeconds(duration: string): number {
	const match = duration.trim().match(/^(\d+(?:\.\d+)?)\s*(s|m|h)$/i);
	if (!match) return 0;
	const value = parseFloat(match[1]);
	const unit = match[2].toLowerCase();
	if (unit === 'h') return value * 3600;
	if (unit === 'm') return value * 60;
	return value;
}

/** Formatea segundos a "Xm Ys" o "Xh Ym" legible */
export function formatSecondsLabel(sec: number): string {
	if (sec < 60) return `${sec}s`;
	if (sec < 3600) {
		const m = Math.floor(sec / 60);
		const s = sec % 60;
		return s > 0 ? `${m}m ${s}s` : `${m}m`;
	}
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Estima requests totales basado en fases.
 * Cada VU ejecuta ~1 iteración cada ~2s (sleep promedio 1-3s).
 * Cada iteración llama N endpoints.
 */
export function estimateRequests(
	phases: { durationSec: number; targetVus: number }[],
	endpointsCount: number,
): number {
	let total = 0;
	let prevVus = 0;
	for (const phase of phases) {
		const avgVus = (prevVus + phase.targetVus) / 2;
		const iterations = (phase.durationSec / 2) * avgVus;
		total += iterations * endpointsCount;
		prevVus = phase.targetVus;
	}
	return Math.round(total);
}
