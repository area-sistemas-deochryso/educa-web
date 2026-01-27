import type { AttendanceStatus } from './attendance.types';

/**
 * Configuración de horas límite para determinar el estado de asistencia.
 * Las horas se expresan en formato 24h como { hour, minute }.
 */
export interface TimeLimit {
	hour: number;
	minute: number;
}

export interface AttendanceTimeConfig {
	temprano: TimeLimit; // Límite para considerar "temprano"
	aTiempo: TimeLimit; // Límite para considerar "a tiempo"
}

/**
 * Configuración de horas para INGRESOS (entrada) - Horario regular (marzo-diciembre):
 * - Temprano (T): antes de las 7:30
 * - A tiempo (A): entre 7:30 y 8:00
 * - Fuera de hora (F): después de las 8:00
 */
export const INGRESO_TIME_CONFIG: AttendanceTimeConfig = {
	temprano: { hour: 7, minute: 30 }, // Antes de 7:30 = Temprano
	aTiempo: { hour: 8, minute: 0 }, // Entre 7:30 y 8:00 = A tiempo, después = Fuera
};

/**
 * Configuración de horas para INGRESOS (entrada) - Horario de verano (enero y febrero):
 * - Temprano (T): antes de las 8:30
 * - A tiempo (A): entre 8:30 y 9:30
 * - Fuera de hora (F): después de las 9:30
 */
export const INGRESO_TIME_CONFIG_VERANO: AttendanceTimeConfig = {
	temprano: { hour: 8, minute: 30 }, // Antes de 8:30 = Temprano
	aTiempo: { hour: 9, minute: 30 }, // Entre 8:30 y 9:30 = A tiempo, después = Fuera
};

/**
 * Configuración de horas para SALIDAS - Horario regular (marzo-diciembre):
 * - Fuera de hora (F): antes de las 14:00
 * - Temprano (T): entre 14:00 y 14:29
 * - A tiempo (A): a partir de las 14:30
 */
export const SALIDA_TIME_CONFIG: AttendanceTimeConfig = {
	temprano: { hour: 14, minute: 0 }, // Antes de 14:00 = Fuera de hora
	aTiempo: { hour: 14, minute: 30 }, // A partir de 14:30 = A tiempo
};

/**
 * Configuración de horas para SALIDAS - Horario de verano (enero y febrero):
 * - Fuera de hora (F): antes de las 12:45
 * - Temprano (T): entre 12:45 y 13:14
 * - A tiempo (A): a partir de las 13:15
 */
export const SALIDA_TIME_CONFIG_VERANO: AttendanceTimeConfig = {
	temprano: { hour: 12, minute: 45 }, // Antes de 12:45 = Fuera de hora
	aTiempo: { hour: 13, minute: 15 }, // A partir de 13:15 = A tiempo
};

/**
 * Determina si un mes es horario de verano (enero o febrero).
 */
export function isHorarioVerano(month: number): boolean {
	return month === 1 || month === 2;
}

/**
 * Compara una hora con un límite de tiempo.
 * Retorna: -1 si es antes, 0 si es igual, 1 si es después.
 */
export function compareTime(hour: number, minute: number, limit: TimeLimit): number {
	const timeInMinutes = hour * 60 + minute;
	const limitInMinutes = limit.hour * 60 + limit.minute;

	if (timeInMinutes < limitInMinutes) return -1;
	if (timeInMinutes > limitInMinutes) return 1;
	return 0;
}

/**
 * Determina el estado de ingreso basado en la hora de entrada.
 * @param hour Hora de entrada
 * @param minute Minutos de entrada
 * @param month Mes (1-12) para aplicar horario de verano en enero/febrero
 */
export function getIngresoStatusFromTime(
	hour: number,
	minute: number,
	month?: number,
): AttendanceStatus {
	const config =
		month && isHorarioVerano(month) ? INGRESO_TIME_CONFIG_VERANO : INGRESO_TIME_CONFIG;

	if (compareTime(hour, minute, config.temprano) < 0) {
		return 'T'; // Temprano
	} else if (compareTime(hour, minute, config.aTiempo) <= 0) {
		return 'A'; // A tiempo
	}
	return 'F'; // Fuera de hora
}

/**
 * Determina el estado de salida basado en la hora de salida.
 * @param hour Hora de salida
 * @param minute Minutos de salida
 * @param month Mes (1-12) para aplicar horario de verano en enero/febrero
 */
export function getSalidaStatusFromTime(
	hour: number,
	minute: number,
	month?: number,
): AttendanceStatus {
	const config = month && isHorarioVerano(month) ? SALIDA_TIME_CONFIG_VERANO : SALIDA_TIME_CONFIG;

	if (compareTime(hour, minute, config.temprano) < 0) {
		return 'F'; // Fuera de hora (salió muy temprano)
	} else if (compareTime(hour, minute, config.aTiempo) < 0) {
		return 'T'; // Temprano
	}
	return 'A'; // A tiempo
}

/**
 * Determina si ya pasó la hora límite de ingreso para hoy.
 * Usa la hora de "a tiempo" del config correspondiente al mes.
 */
export function hasIngresoTimePassed(month: number): boolean {
	const now = new Date();
	const config = isHorarioVerano(month) ? INGRESO_TIME_CONFIG_VERANO : INGRESO_TIME_CONFIG;
	return compareTime(now.getHours(), now.getMinutes(), config.aTiempo) > 0;
}

/**
 * Determina si ya pasó la hora límite de salida para hoy.
 * Usa la hora de "a tiempo" del config correspondiente al mes.
 */
export function hasSalidaTimePassed(month: number): boolean {
	const now = new Date();
	const config = isHorarioVerano(month) ? SALIDA_TIME_CONFIG_VERANO : SALIDA_TIME_CONFIG;
	return compareTime(now.getHours(), now.getMinutes(), config.aTiempo) >= 0;
}
