export type AttendanceStatus = 'T' | 'A' | 'F' | 'N';

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
