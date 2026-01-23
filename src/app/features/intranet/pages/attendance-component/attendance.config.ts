import { AttendanceStatus, LegendItem, MonthOption } from './attendance.types';

export const ATTENDANCE_STORAGE_KEY = 'attendance_selected_month';

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
 * Configuración de horas para INGRESOS (entrada):
 * - Temprano (T): antes de las 7:30
 * - A tiempo (A): entre 7:30 y 8:00
 * - Fuera de hora (F): después de las 8:00
 */
export const INGRESO_TIME_CONFIG: AttendanceTimeConfig = {
	temprano: { hour: 7, minute: 30 }, // Antes de 7:30 = Temprano
	aTiempo: { hour: 8, minute: 0 }, // Entre 7:30 y 8:00 = A tiempo, después = Fuera
};

/**
 * Configuración de horas para SALIDAS:
 * - Fuera de hora (F): antes de las 14:00
 * - Temprano (T): entre 14:00 y 14:29
 * - A tiempo (A): a partir de las 14:30
 */
export const SALIDA_TIME_CONFIG: AttendanceTimeConfig = {
	temprano: { hour: 14, minute: 0 }, // Antes de 14:00 = Fuera de hora
	aTiempo: { hour: 14, minute: 30 }, // A partir de 14:30 = A tiempo
};

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
 */
export function getIngresoStatusFromTime(hour: number, minute: number): AttendanceStatus {
	if (compareTime(hour, minute, INGRESO_TIME_CONFIG.temprano) < 0) {
		return 'T'; // Antes de 7:30 = Temprano
	} else if (compareTime(hour, minute, INGRESO_TIME_CONFIG.aTiempo) <= 0) {
		return 'A'; // Entre 7:30 y 8:00 = A tiempo
	}
	return 'F'; // Después de 8:00 = Fuera de hora
}

/**
 * Determina el estado de salida basado en la hora de salida.
 */
export function getSalidaStatusFromTime(hour: number, minute: number): AttendanceStatus {
	if (compareTime(hour, minute, SALIDA_TIME_CONFIG.temprano) < 0) {
		return 'F'; // Antes de 14:00 = Fuera de hora (salió muy temprano)
	} else if (compareTime(hour, minute, SALIDA_TIME_CONFIG.aTiempo) < 0) {
		return 'T'; // Entre 14:00 y 14:29 = Temprano
	}
	return 'A'; // A partir de 14:30 = A tiempo
}

export const MONTH_OPTIONS: MonthOption[] = [
	{ label: 'Enero', value: 1 },
	{ label: 'Febrero', value: 2 },
	{ label: 'Marzo', value: 3 },
	{ label: 'Abril', value: 4 },
	{ label: 'Mayo', value: 5 },
	{ label: 'Junio', value: 6 },
	{ label: 'Julio', value: 7 },
	{ label: 'Agosto', value: 8 },
	{ label: 'Septiembre', value: 9 },
	{ label: 'Octubre', value: 10 },
	{ label: 'Noviembre', value: 11 },
	{ label: 'Diciembre', value: 12 },
];

export const DAY_HEADERS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export const LEGEND_ITEMS: LegendItem[] = [
	{ code: 'T', label: 'Temprano', status: 'T' },
	{ code: 'A', label: 'A tiempo', status: 'A' },
	{ code: 'F', label: 'Fuera de hora', status: 'F' },
	{ code: 'N', label: 'No asistió', status: 'N' },
];

export const STATUS_CLASSES: Record<AttendanceStatus, string> = {
	T: 'status-temprano',
	A: 'status-atiempo',
	F: 'status-fuera',
	N: 'status-no',
};

export function getStatusClass(status: AttendanceStatus): string {
	return STATUS_CLASSES[status];
}
