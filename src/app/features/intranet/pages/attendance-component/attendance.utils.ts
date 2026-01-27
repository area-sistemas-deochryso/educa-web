import { ATTENDANCE_START_DATE } from './attendance.constants';
import { hasIngresoTimePassed, hasSalidaTimePassed } from './attendance-time.config';

/**
 * Normaliza una fecha a medianoche (00:00:00) para comparaciones de solo fecha.
 */
function normalizeDate(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Determina si una fecha es anterior a la fecha de inicio del registro.
 */
export function isBeforeRegistrationStart(date: Date): boolean {
	return normalizeDate(date) < normalizeDate(ATTENDANCE_START_DATE);
}

/**
 * Determina si una fecha es futura (posterior a hoy).
 */
export function isFutureDate(date: Date): boolean {
	const today = normalizeDate(new Date());
	return normalizeDate(date) > today;
}

/**
 * Determina si una fecha es hoy.
 */
export function isToday(date: Date): boolean {
	const today = normalizeDate(new Date());
	return normalizeDate(date).getTime() === today.getTime();
}

/**
 * Determina si un día debe marcarse como pendiente ('-') para INGRESOS.
 * Solo aplica a días futuros o de hoy donde aún no pasó la hora límite.
 * NO incluye días anteriores al inicio del registro (esos usan 'X').
 */
export function shouldMarkIngresoAsPending(date: Date, month: number): boolean {
	if (isFutureDate(date)) return true;
	if (isToday(date) && !hasIngresoTimePassed(month)) return true;
	return false;
}

/**
 * Determina si un día debe marcarse como pendiente ('-') para SALIDAS.
 * Solo aplica a días futuros o de hoy donde aún no pasó la hora límite.
 * NO incluye días anteriores al inicio del registro (esos usan 'X').
 */
export function shouldMarkSalidaAsPending(date: Date, month: number): boolean {
	if (isFutureDate(date)) return true;
	if (isToday(date) && !hasSalidaTimePassed(month)) return true;
	return false;
}
