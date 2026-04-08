// #region Imports
import type { AttendanceStatus, MonthOption } from '../models/attendance.types';

/**
 * Clave para almacenar el mes seleccionado en localStorage.
 */
// #endregion
// #region Implementation
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
 * Configuración completa de cada estado de asistencia admin (entrada).
 * Fuente única para clase CSS, label y grupo (presente/tardanza/falta).
 */
export interface AttendanceStatusConfig {
	cssClass: string;
	/** Clase CSS usada en la vista mensual de salones (admin) */
	salonClass: string;
	label: string;
	group: 'presente' | 'tardanza' | 'falta' | 'justificado' | 'pendiente' | 'sin-registro';
}

export const ATTENDANCE_STATUS_CONFIGS: Record<AttendanceStatus, AttendanceStatusConfig> = {
	T: { cssClass: 'status-temprano', salonClass: 'estado-presente', label: 'T', group: 'presente' },
	A: { cssClass: 'status-atiempo', salonClass: 'estado-presente', label: 'A', group: 'presente' },
	F: { cssClass: 'status-fuera', salonClass: 'estado-tardanza', label: 'F', group: 'tardanza' },
	N: { cssClass: 'status-no', salonClass: 'estado-falta', label: 'N', group: 'falta' },
	J: { cssClass: 'status-justificado', salonClass: 'estado-justificado', label: 'J', group: 'justificado' },
	'-': { cssClass: 'status-pendiente', salonClass: 'estado-vacio', label: '-', group: 'pendiente' },
	X: { cssClass: 'status-sin-registro', salonClass: 'estado-vacio', label: '', group: 'sin-registro' },
};

/**
 * Obtiene la clase CSS para un estado de asistencia (calendario).
 * Derivado de ATTENDANCE_STATUS_CONFIGS — fuente única de verdad.
 */
export function getStatusClass(status: AttendanceStatus): string {
	return ATTENDANCE_STATUS_CONFIGS[status]?.cssClass ?? 'status-sin-registro';
}

/**
 * Obtiene la clase CSS de salón para un estado de asistencia (vista mensual admin).
 */
export function getSalonStatusClass(status: AttendanceStatus | null): string {
	if (!status) return 'estado-vacio';
	return ATTENDANCE_STATUS_CONFIGS[status]?.salonClass ?? 'estado-vacio';
}

/**
 * Obtiene el label para un estado de asistencia.
 */
export function getStatusLabel(status: AttendanceStatus | null): string {
	if (!status) return '';
	return ATTENDANCE_STATUS_CONFIGS[status]?.label ?? '';
}
// #endregion
