// #region Implementation
// A = Asistió (ingreso dentro de +50min), T = Tardanza (+50min a +2h), F = Falta (después de +2h)
// J = Justificado (falta con justificación registrada)
// '-' = Pendiente (día futuro o de hoy sin hora aún)
// 'X' = No contabilizado (antes del 26/01/2026 o período vacacional)
export type AttendanceStatus = 'A' | 'T' | 'F' | 'J' | '-' | 'X';

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
// #endregion
