// T = Temprano, A = A tiempo, F = Fuera de hora, N = No asistió
// '-' = Pendiente (día futuro o de hoy sin hora aún), 'X' = Sin registro (antes del 26/01/2026)
export type AttendanceStatus = 'T' | 'A' | 'F' | 'N' | '-' | 'X';

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
