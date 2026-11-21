// #region Implementation
export type TimeStatus = 'upcoming' | 'ongoing' | 'finished';

/** Normaliza a 'YYYY-MM-DD' en hora local, para comparar días sin desfase de zona horaria. */
function toDayKey(value: string | Date): string {
	if (typeof value === 'string') return value.slice(0, 10);
	const month = String(value.getMonth() + 1).padStart(2, '0');
	const day = String(value.getDate()).padStart(2, '0');
	return `${value.getFullYear()}-${month}-${day}`;
}

/**
 * Estado temporal de un evento o vigencia respecto de "hoy".
 * Sin fecha de fin el evento dura solo su día de inicio.
 */
export function getTimeStatus(
	start: string | Date,
	end: string | Date | null | undefined,
	today: string | Date = new Date(),
): TimeStatus {
	const startKey = toDayKey(start);
	const endKey = end ? toDayKey(end) : startKey;
	const todayKey = toDayKey(today);

	if (todayKey < startKey) return 'upcoming';
	if (todayKey > endKey) return 'finished';
	return 'ongoing';
}
// #endregion
