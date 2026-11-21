// #region Imports
import { resolveEventMarkerKind, type EventMarkerKind } from '@shared/components';
import type { CalendarEntry, CalendarMonth, ModalData } from './calendar.types';
import type { CalendarEvent } from './events.config';

// #endregion
// #region Implementation
const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

const KIND_LABEL: Record<EventMarkerKind, string> = {
	holiday: 'Feriado',
	academic: 'Académico',
	cultural: 'Cultural',
	sports: 'Deportivo',
	meeting: 'Reunión',
	other: 'Otro',
};

export function getEntryKindLabel(kind: EventMarkerKind): string {
	return KIND_LABEL[kind];
}

/** 'YYYY-MM-DD' en hora local. */
export function toYmd(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

export function ymdToDate(ymd: string): Date {
	const [year, month, day] = ymd.split('-').map(Number);
	return new Date(year, month - 1, day);
}

/** Ej: '2026-11-23' → '23 nov'. */
export function formatShortDate(ymd: string): string {
	const [, month, day] = ymd.split('-').map(Number);
	return `${day} ${MONTHS_SHORT[month - 1] ?? ''}`;
}

/** Une los feriados de los meses generados con los eventos del año, ordenados por inicio. */
export function buildCalendarEntries(months: CalendarMonth[], events: CalendarEvent[]): CalendarEntry[] {
	const entries: CalendarEntry[] = [];

	for (const month of months) {
		for (const day of month.days) {
			if (!day.isCurrentMonth || !day.holiday) continue;
			const ymd = toYmd(day.fullDate);
			entries.push({ id: `h-${ymd}`, kind: 'holiday', title: day.holiday.name, start: ymd, end: null, holiday: day.holiday });
		}
	}

	for (const event of events) {
		entries.push({
			id: `e-${event.date}-${event.title}`,
			kind: resolveEventMarkerKind(event.type),
			title: event.title,
			start: event.date,
			end: event.endDate ?? null,
			time: event.time,
			location: event.location,
			event,
		});
	}

	return entries.sort((a, b) => a.start.localeCompare(b.start) || (b.end ?? b.start).localeCompare(a.end ?? a.start));
}

export function entriesOnDay(entries: readonly CalendarEntry[], ymd: string): CalendarEntry[] {
	return entries.filter((e) => ymd >= e.start && ymd <= (e.end ?? e.start));
}

export function entriesInMonth(entries: readonly CalendarEntry[], year: number, month: number): CalendarEntry[] {
	const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
	return entries.filter((e) => e.start <= `${prefix}-31` && (e.end ?? e.start) >= `${prefix}-01`);
}

/** Cantidad de entradas que tocan cada mes (0-11) del año dado. */
export function countEntriesByMonth(entries: readonly CalendarEntry[], year: number): number[] {
	return Array.from({ length: 12 }, (_, month) => entriesInMonth(entries, year, month).length);
}

export function entryToModalData(entry: CalendarEntry, date: Date): ModalData {
	if (entry.holiday) return { type: 'holiday', date, holiday: entry.holiday };
	return { type: 'event', date, event: entry.event };
}
// #endregion
