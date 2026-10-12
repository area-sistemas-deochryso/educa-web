// #region Nearest valid date (bidirectional)
/**
 * Encuentra la fecha más cercana a `fromDate` (en cualquier dirección) cuyo `getDay()`
 * coincida con `targetDayOfWeek`. Distinto de `getNextOccurrence` de
 * `profesor-horarios.helpers.ts`, que solo busca hacia adelante.
 *
 * Nota: con semana de 7 días, adelante y atrás nunca quedan a igual distancia
 * (offsets 1-6 siempre suman 7), así que siempre hay una dirección estrictamente
 * más cercana. `<=` en la comparación es solo una guarda defensiva.
 *
 * Con `notAfter` el resultado nunca es posterior a esa fecha (por día calendario): si la más
 * cercana cae en el futuro, retrocede a la ocurrencia anterior. El backend rechaza fechas
 * posteriores a hoy, así que el atajo no puede llevar ahí.
 */
export function findNearestValidDate(fromDate: Date, targetDayOfWeek: number, notAfter?: Date): Date {
	const nearest = findNearest(fromDate, targetDayOfWeek);
	if (!notAfter) return nearest;

	const limit = new Date(notAfter.getFullYear(), notAfter.getMonth(), notAfter.getDate());
	const candidate = new Date(nearest.getFullYear(), nearest.getMonth(), nearest.getDate());
	if (candidate.getTime() <= limit.getTime()) return nearest;

	candidate.setDate(candidate.getDate() - 7);
	return candidate;
}

function findNearest(fromDate: Date, targetDayOfWeek: number): Date {
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
