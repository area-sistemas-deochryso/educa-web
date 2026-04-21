/**
 * Helpers para los query params del cross-link desde `AttendanceDirectorComponent`
 * hacia `/intranet/admin/asistencias` (Plan 23 Chat 5).
 *
 * Parámetros soportados: `tab`, `tipoPersona`, `dni`, `fecha` (YYYY-MM-DD).
 */

/** Valida formato YYYY-MM-DD con componentes numéricos existentes (incluye año bisiesto). */
export function isValidDateIso(iso: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
	const [y, m, d] = iso.split('-').map(Number);
	if (m < 1 || m > 12 || d < 1 || d > 31) return false;
	const date = new Date(y, m - 1, d);
	return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Parsea YYYY-MM-DD en `Date` local (evita desfase de zona horaria). */
export function parseIsoDate(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}
