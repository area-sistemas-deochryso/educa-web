// #region Nearest valid date (bidirectional)
/**
 * Encuentra la fecha más cercana a `fromDate` (en cualquier dirección) cuyo `getDay()`
 * coincida con `targetDayOfWeek`. Distinto de `getNextOccurrence` de
 * `profesor-horarios.helpers.ts`, que solo busca hacia adelante.
 *
 * Nota: con semana de 7 días, adelante y atrás nunca quedan a igual distancia
 * (offsets 1-6 siempre suman 7), así que siempre hay una dirección estrictamente
 * más cercana. `<=` en la comparación es solo una guarda defensiva.
 */
export function findNearestValidDate(fromDate: Date, targetDayOfWeek: number): Date {
	const currentDay = fromDate.getDay();
	if (currentDay === targetDayOfWeek) return new Date(fromDate);

	const forwardOffset = (targetDayOfWeek - currentDay + 7) % 7;
	const backwardOffset = (currentDay - targetDayOfWeek + 7) % 7;
	const offset = forwardOffset <= backwardOffset ? forwardOffset : -backwardOffset;

	const result = new Date(fromDate);
	result.setDate(result.getDate() + offset);
	return result;
}
// #endregion
