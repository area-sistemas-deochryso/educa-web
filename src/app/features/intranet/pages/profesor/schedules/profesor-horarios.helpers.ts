import { HorarioBlock, getNextOccurrence } from '@intranet-shared/helpers';

export type { HorarioBlock } from '@intranet-shared/helpers';
export { buildBlocks, getNextOccurrence, formatDateISO } from '@intranet-shared/helpers';

// #region Types
export type CountdownUrgency = 'normal' | 'warning' | 'danger-low' | 'danger';

export interface CountdownInfo {
	blockId: number;
	label: string;
	urgency: CountdownUrgency;
}
// #endregion

// #region Countdown
function getUrgency(remainingMs: number): CountdownUrgency {
	const mins = remainingMs / 60_000;
	if (mins < 10) return 'danger';
	if (mins < 30) return 'danger-low';
	if (mins < 60) return 'warning';
	return 'normal';
}

function formatCountdown(remainingMs: number): string {
	const totalSecs = Math.max(0, Math.floor(remainingMs / 1000));
	const d = Math.floor(totalSecs / 86400);
	const h = Math.floor((totalSecs % 86400) / 3600);
	const m = Math.floor((totalSecs % 3600) / 60);
	const s = totalSecs % 60;

	if (d > 0) return `en ${d}d ${h}h`;
	if (h > 0) return `en ${h}h ${m}m`;
	if (m > 0) return `en ${m}m ${s}s`;
	return `en ${s}s`;
}

/**
 * Calcula countdown para cada bloque horario hacia su próxima ocurrencia.
 * Urgency se mapea a colores CSS: danger (<10min), danger-low (<30min), warning (<60min), normal (>60min).
 */
export function buildCountdownMap(blocks: HorarioBlock[], now: Date): Map<number, CountdownInfo> {
	const map = new Map<number, CountdownInfo>();
	for (const block of blocks) {
		const nextDate = getNextOccurrence(block, now);
		const remainingMs = nextDate.getTime() - now.getTime();
		map.set(block.id, {
			blockId: block.id,
			label: formatCountdown(remainingMs),
			urgency: getUrgency(remainingMs),
		});
	}
	return map;
}
// #endregion
