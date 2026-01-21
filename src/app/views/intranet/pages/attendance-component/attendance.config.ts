import { AttendanceStatus, MonthOption, LegendItem } from './attendance.types';

export const ATTENDANCE_STORAGE_KEY = 'attendance_selected_month';

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
	{ code: 'F', label: 'Fuera de horario', status: 'F' },
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
