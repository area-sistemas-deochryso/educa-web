/**
 * Utilidades de fecha en formato local (sin desfase UTC).
 *
 * `toISOString()` convierte a UTC, rompiendo la fecha en zonas con offset negativo
 * (Perú UTC-5: ej. un `Date(2026, 3, 21, 0, 0)` se serializa como `2026-04-20`).
 * Estos helpers operan sobre la fecha *local* del `Date`.
 */

/** Formatea un `Date` como `YYYY-MM-DD` usando los componentes locales. */
export function formatDateLocalIso(fecha: Date): string {
	const y = fecha.getFullYear();
	const m = String(fecha.getMonth() + 1).padStart(2, '0');
	const d = String(fecha.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}
