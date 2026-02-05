// T = Temprano, A = A tiempo, F = Fuera de hora, N = No asistió
// J = Justificado (falta con justificación registrada)
// '-' = Pendiente (día futuro o de hoy sin hora aún)
// 'X' = No contabilizado (antes del 26/01/2026 o período vacacional)
export type AttendanceStatus = 'T' | 'A' | 'F' | 'N' | 'J' | '-' | 'X';

export interface AttendanceDay {
	day: string;
	date: Date | null;
	status: AttendanceStatus;
	hora?: string | null;
}

export interface AttendanceWeek {
	week: string;
	days: AttendanceDay[];
	total: string;
}

export interface StatusCounts {
	T: number;
	A: number;
	F: number;
	N: number;
	J: number;
	'-': number;
	X: number;
}

export interface AttendanceTable {
	title: string;
	selectedMonth: number;
	selectedYear: number;
	weeks: AttendanceWeek[];
	counts: StatusCounts;
	columnTotals: string[];
	grandTotal: string;
}

export interface MonthOption {
	label: string;
	value: number;
}

export interface LegendItem {
	code: string;
	label: string;
	status: AttendanceStatus;
}
