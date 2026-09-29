import type { AttendancePanelFilters } from '../models';

export type FutureNotice = { kind: 'partial'; until: Date } | { kind: 'total' };

function startOfDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Lun-Vie de la semana que contiene `fecha`. */
function weekBounds(fecha: Date): { start: Date; end: Date } {
	const d = startOfDay(fecha);
	const offsetToMonday = (d.getDay() + 6) % 7;
	const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offsetToMonday);
	const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 4);
	return { start, end };
}

function monthBounds(fecha: Date): { start: Date; end: Date } {
	return {
		start: new Date(fecha.getFullYear(), fecha.getMonth(), 1),
		end: new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0),
	};
}

/** Avisa si el periodo Semana/Mes de `fecha` incluye días que aún no ocurrieron (Día no aplica). */
export function getFutureNotice(
	rango: AttendancePanelFilters['rango'],
	fecha: Date,
	hoy: Date,
): FutureNotice | null {
	if (rango === 'dia') return null;
	const { start, end } = rango === 'semana' ? weekBounds(fecha) : monthBounds(fecha);
	const today = startOfDay(hoy);
	if (start > today) return { kind: 'total' };
	if (end > today) return { kind: 'partial', until: today };
	return null;
}
