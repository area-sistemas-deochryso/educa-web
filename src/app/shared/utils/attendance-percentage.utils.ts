// #region Constants
/** INV-AC11: texto auxiliar bajo la cifra de %, visible sin interacción (sin tooltip). */
export const ATTENDANCE_PERCENTAGE_LEGEND =
	'Las tardanzas cuentan como asistencia: (presentes + tardanzas) ÷ clases.';

/** INV-AC11: sin clases registradas nunca se muestra "0 %". */
export const ATTENDANCE_EMPTY_LABEL = 'Sin registros';
// #endregion

// #region Functions
/**
 * `round((Presente + Tarde) ÷ TotalClases × 100)` (INV-AC11).
 * Devuelve `null` cuando no hay clases registradas: el llamador muestra
 * {@link ATTENDANCE_EMPTY_LABEL} en lugar de un "0 %" falso.
 */
export function calcAttendancePercentage(presente: number, tarde: number, totalClases: number): number | null {
	if (totalClases <= 0) return null;
	return Math.round(((presente + tarde) / totalClases) * 100);
}
// #endregion
