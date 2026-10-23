/**
 * Utilidades de fecha en formato local (sin desfase UTC).
 *
 * `toISOString()` convierte a UTC, rompiendo la fecha en zonas con offset negativo
 * (Perú UTC-5: ej. un `Date(2026, 3, 21, 0, 0)` se serializa como `2026-04-20`).
 * Estos helpers operan sobre la fecha *local* del `Date`.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Formatea un `Date` como `YYYY-MM-DD` usando los componentes locales. */
export function formatDateLocalIso(fecha: Date): string {
	return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

/** Parsea el prefijo `YYYY-MM-DD` de un ISO como fecha local a medianoche; `null` si no tiene ese formato. */
export function parseDateLocal(iso: string | null | undefined): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
	if (!match) return null;
	return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Formatea un `Date` como `YYYY-MM-DDTHH:mm:ss.000` usando los componentes locales (sin sufijo Z). */
export function toLocalIso(fecha: Date): string {
	return `${formatDateLocalIso(fecha)}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:00.000`;
}
