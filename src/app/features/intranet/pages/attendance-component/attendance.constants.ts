import type { AttendanceStatus, LegendItem, MonthOption } from './attendance.types';

/**
 * Clave para almacenar el mes seleccionado en localStorage.
 */
export const ATTENDANCE_STORAGE_KEY = 'attendance_selected_month';

/**
 * Fecha de inicio del registro de asistencias.
 * Fechas anteriores a esta no se cuentan como falta.
 */
export const ATTENDANCE_START_DATE = new Date(2026, 0, 26); // 26 de enero de 2026

/**
 * Opciones de meses para el selector.
 */
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

/**
 * Encabezados de días de la semana (lunes a viernes).
 */
export const DAY_HEADERS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

/**
 * Items de la leyenda de asistencia.
 */
export const LEGEND_ITEMS: LegendItem[] = [
	{ code: 'T', label: 'Temprano', status: 'T' },
	{ code: 'A', label: 'A tiempo', status: 'A' },
	{ code: 'F', label: 'Fuera de hora', status: 'F' },
	{ code: 'N', label: 'No asistió', status: 'N' },
	{ code: '-', label: 'Pendiente', status: '-' },
];

/**
 * Mapeo de estados de asistencia a clases CSS.
 */
export const STATUS_CLASSES: Record<AttendanceStatus, string> = {
	T: 'status-temprano',
	A: 'status-atiempo',
	F: 'status-fuera',
	N: 'status-no',
	'-': 'status-pendiente',
	X: 'status-sin-registro',
};

/**
 * Obtiene la clase CSS para un estado de asistencia.
 */
export function getStatusClass(status: AttendanceStatus): string {
	return STATUS_CLASSES[status];
}
