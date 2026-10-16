// #region Imports
import { HorarioBlock, getNextOccurrence, todayDia } from '@intranet-shared/helpers';

// #endregion
// #region Types
export type EmptyScheduleCause = 'weekend' | 'no-schedule' | 'no-classes-today';

export interface NextClass {
	block: HorarioBlock;
	date: Date;
}
// #endregion

// #region Helpers
/** Causa de un día sin bloques: el fin de semana tiene prioridad; luego "sin horario" vs "sin clases hoy". */
export function emptyScheduleCause(now: Date, weekBlocks: HorarioBlock[]): EmptyScheduleCause {
	if (todayDia(now) === 0) return 'weekend';
	return weekBlocks.length === 0 ? 'no-schedule' : 'no-classes-today';
}

/** Primera ocurrencia futura de cualquier bloque del horario semanal; `null` si no hay horario. */
export function findNextClass(now: Date, weekBlocks: HorarioBlock[]): NextClass | null {
	let next: NextClass | null = null;
	for (const block of weekBlocks) {
		const date = getNextOccurrence(block, now);
		if (!next || date < next.date) next = { block, date };
	}
	return next;
}

/** Clase de hoy en curso o la siguiente que aún no terminó; `null` si hoy no queda ninguna. */
export function currentOrNextClassToday(now: Date, todayBlocks: HorarioBlock[]): HorarioBlock | null {
	const nowMinutes = now.getHours() * 60 + now.getMinutes();
	return (
		[...todayBlocks]
			.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
			.find((b) => toMinutes(b.horaFin) > nowMinutes) ?? null
	);
}

/** "mañana, 08:00 - 09:00" o "lunes, 08:00 - 09:00". */
export function nextClassLabel(next: NextClass, now: Date): string {
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const day =
		next.date.toDateString() === tomorrow.toDateString()
			? 'mañana'
			: next.date.toLocaleDateString('es-PE', { weekday: 'long' });
	return `${day}, ${next.block.horaInicio} - ${next.block.horaFin}`;
}

function toMinutes(time: string): number {
	const [h, m] = time.split(':').map(Number);
	return h * 60 + m;
}
// #endregion
