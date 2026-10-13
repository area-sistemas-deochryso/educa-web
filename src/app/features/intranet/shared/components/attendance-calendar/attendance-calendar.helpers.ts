// #region Types
export const ATTENDANCE_CALENDAR_STATES = ['P', 'T', 'F', 'J'] as const;
export type AttendanceCalendarState = (typeof ATTENDANCE_CALENDAR_STATES)[number];

/**
 * Un día con su estado. Mismos nombres que el detalle de asistencia del estudiante
 * (`MiAsistenciaCursoItemDto`) para que F25b pase el arreglo del cable sin mapear.
 */
export interface AttendanceCalendarDay {
	/** `YYYY-MM-DD`; tolera sufijo con hora (`2026-10-12T00:00:00`). */
	readonly fecha: string;
	readonly estado: AttendanceCalendarState;
	/** `INV-AC10`: clase fuera del día de horario. */
	readonly esRecuperacion?: boolean;
}

export interface CalendarMonthRef {
	readonly year: number;
	/** 1-12. */
	readonly month: number;
}

export interface AttendanceCalendarRecord {
	readonly estado: AttendanceCalendarState;
	readonly esRecuperacion: boolean;
}
// #endregion

// #region Constants
export const ATTENDANCE_STATE_LABELS: Record<AttendanceCalendarState, string> = {
	P: 'Presente',
	T: 'Tarde',
	F: 'Faltó',
	J: 'Justificado',
};

export const ATTENDANCE_STATE_ICONS: Record<AttendanceCalendarState, string> = {
	P: 'pi pi-check-circle',
	T: 'pi pi-clock',
	F: 'pi pi-times-circle',
	J: 'pi pi-file-check',
};

export const MONTH_NAMES = [
	'enero',
	'febrero',
	'marzo',
	'abril',
	'mayo',
	'junio',
	'julio',
	'agosto',
	'septiembre',
	'octubre',
	'noviembre',
	'diciembre',
] as const;

/** Semana que empieza en lunes (días de clase). */
export const WEEKDAYS = [
	{ short: 'Lun', full: 'lunes' },
	{ short: 'Mar', full: 'martes' },
	{ short: 'Mié', full: 'miércoles' },
	{ short: 'Jue', full: 'jueves' },
	{ short: 'Vie', full: 'viernes' },
	{ short: 'Sáb', full: 'sábado' },
	{ short: 'Dom', full: 'domingo' },
] as const;

/**
 * Si dos registros caen en la misma fecha (p. ej. dos franjas), se muestra el de mayor
 * gravedad: lo que el lector no debe perderse es la falta o la tarde.
 */
const STATE_SEVERITY: Record<AttendanceCalendarState, number> = { F: 4, T: 3, J: 2, P: 1 };
// #endregion

// #region Date helpers
const DAY_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const MONTH_KEY = /^(\d{4})-(\d{2})$/;

/**
 * Valida el prefijo `YYYY-MM-DD` sin pasar por `new Date(texto)`: en UTC-5 un parseo con o sin
 * hora corre el día (bug F19/H24). Devuelve la clave normalizada o `null`.
 */
export function toDayKey(fecha: string | null | undefined): string | null {
	const match = typeof fecha === 'string' ? DAY_PREFIX.exec(fecha) : null;
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
	return match[0];
}

export function parseMonthKey(key: string | null | undefined): CalendarMonthRef | null {
	const match = typeof key === 'string' ? MONTH_KEY.exec(key) : null;
	if (!match) return null;
	const month = Number(match[2]);
	return month >= 1 && month <= 12 ? { year: Number(match[1]), month } : null;
}

export function formatMonthKey(ref: CalendarMonthRef): string {
	return `${String(ref.year).padStart(4, '0')}-${String(ref.month).padStart(2, '0')}`;
}

export function monthIndex(ref: CalendarMonthRef): number {
	return ref.year * 12 + (ref.month - 1);
}

export function monthFromIndex(index: number): CalendarMonthRef {
	return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = lunes … 6 = domingo. */
export function weekdayIndex(year: number, month: number, day: number): number {
	return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

/** Suma `offset` días a una fecha calendario, sin zona horaria. */
export function addDays(ref: CalendarMonthRef, day: number, offset: number): CalendarMonthRef & { day: number } {
	const shifted = new Date(Date.UTC(ref.year, ref.month - 1, day + offset));
	return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/** Filas de 7 columnas (lunes primero); `null` completa los huecos de inicio y fin. */
export function buildMonthWeeks(year: number, month: number): (number | null)[][] {
	const offset = weekdayIndex(year, month, 1);
	const total = daysInMonth(year, month);
	const cells: (number | null)[] = [
		...Array.from<null>({ length: offset }).fill(null),
		...Array.from({ length: total }, (_, i) => i + 1),
	];
	while (cells.length % 7 !== 0) cells.push(null);
	const weeks: (number | null)[][] = [];
	for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
	return weeks;
}

/** «lunes 12 de octubre de 2026». */
export function describeDate(year: number, month: number, day: number): string {
	const weekday = WEEKDAYS[weekdayIndex(year, month, day)].full;
	return `${weekday} ${day} de ${MONTH_NAMES[month - 1]} de ${year}`;
}
// #endregion

// #region Record helpers
/**
 * Indexa los registros por `YYYY-MM-DD`. Descarta fechas inválidas y estados desconocidos
 * (mejor un día neutro que uno inventado).
 */
export function indexRecords(days: readonly AttendanceCalendarDay[]): Map<string, AttendanceCalendarRecord> {
	const index = new Map<string, AttendanceCalendarRecord>();
	for (const day of days) {
		const key = toDayKey(day?.fecha);
		if (!key || !(day.estado in STATE_SEVERITY)) continue;
		const incoming: AttendanceCalendarRecord = { estado: day.estado, esRecuperacion: day.esRecuperacion === true };
		const current = index.get(key);
		if (!current) {
			index.set(key, incoming);
			continue;
		}
		const winner = STATE_SEVERITY[incoming.estado] > STATE_SEVERITY[current.estado] ? incoming : current;
		index.set(key, { estado: winner.estado, esRecuperacion: current.esRecuperacion || incoming.esRecuperacion });
	}
	return index;
}

/** Mes del registro más reciente, para abrir el calendario donde hay datos. */
export function latestRecordMonth(records: ReadonlyMap<string, AttendanceCalendarRecord>): CalendarMonthRef | null {
	let latest: string | null = null;
	for (const key of records.keys()) if (latest === null || key > latest) latest = key;
	return latest ? parseMonthKey(latest.slice(0, 7)) : null;
}

export function describeCell(
	year: number,
	month: number,
	day: number,
	record: AttendanceCalendarRecord | undefined,
): string {
	const date = describeDate(year, month, day);
	if (!record) return `${date}: sin registro`;
	const recovery = record.esRecuperacion ? ', clase de recuperación' : '';
	return `${date}: ${ATTENDANCE_STATE_LABELS[record.estado]}${recovery}`;
}
// #endregion
