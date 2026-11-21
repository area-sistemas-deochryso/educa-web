import { describe, expect, it } from 'vitest';

import type { CalendarDay, CalendarEntry, CalendarMonth } from './calendar.types';
import type { CalendarEvent } from './events.config';
import {
	buildCalendarEntries,
	countEntriesByMonth,
	entriesInMonth,
	entriesOnDay,
	entryToModalData,
	formatShortDate,
	toYmd,
} from './calendar-entries.utils';

const holiday = { date: '12-08', name: 'Inmaculada Concepción', description: '', type: 'national' as const, icon: 'pi-star' };

function day(date: Date, isCurrentMonth: boolean, withHoliday: boolean): CalendarDay {
	return {
		date: date.getDate(),
		isCurrentMonth,
		isToday: false,
		isWeekend: false,
		isHoliday: withHoliday,
		hasEvent: false,
		isInEventRange: false,
		isEventEnd: false,
		holiday: withHoliday ? holiday : null,
		event: null,
		rangeEvent: null,
		fullDate: date,
	};
}

const december: CalendarMonth = {
	name: 'Diciembre',
	year: 2026,
	month: 11,
	id: 'month-11',
	days: [day(new Date(2026, 11, 8), true, true), day(new Date(2026, 10, 30), false, true)],
};

const events: CalendarEvent[] = [
	{ date: '2026-12-04', endDate: '2026-12-05', title: 'Olimpiadas', description: '', type: 'sports', icon: 'pi-flag', time: '9:00 AM' },
	{ date: '2026-11-30', endDate: '2026-12-02', title: 'Exámenes', description: '', type: 'academic', icon: 'pi-book' },
];

describe('calendar-entries.utils', () => {
	const entries = buildCalendarEntries([december], events);

	it('une feriados del mes actual y eventos, ordenados por inicio', () => {
		expect(entries.map((e) => e.title)).toEqual(['Exámenes', 'Olimpiadas', 'Inmaculada Concepción']);
	});

	it('ignora feriados de días de otro mes', () => {
		expect(entries.filter((e) => e.kind === 'holiday')).toHaveLength(1);
	});

	it('usa el tipo del evento como kind', () => {
		expect(entries.find((e) => e.title === 'Olimpiadas')?.kind).toBe('sports');
	});

	it('entriesOnDay incluye los días intermedios de un rango', () => {
		expect(entriesOnDay(entries, '2026-12-01').map((e) => e.title)).toEqual(['Exámenes']);
		expect(entriesOnDay(entries, '2026-12-05').map((e) => e.title)).toEqual(['Olimpiadas']);
	});

	it('entriesInMonth incluye eventos que arrancan el mes anterior', () => {
		expect(entriesInMonth(entries, 2026, 11).map((e) => e.title)).toContain('Exámenes');
		expect(entriesInMonth(entries, 2026, 10).map((e) => e.title)).toEqual(['Exámenes']);
	});

	it('countEntriesByMonth devuelve 12 posiciones', () => {
		const counts = countEntriesByMonth(entries, 2026);
		expect(counts).toHaveLength(12);
		expect(counts[11]).toBe(3);
		expect(counts[0]).toBe(0);
	});

	it('entryToModalData distingue feriado de evento', () => {
		const date = new Date(2026, 11, 8);
		const holidayEntry = entries.find((e) => e.kind === 'holiday') as CalendarEntry;
		expect(entryToModalData(holidayEntry, date).type).toBe('holiday');
		expect(entryToModalData(entries[1], date).type).toBe('event');
	});

	it('toYmd y formatShortDate', () => {
		expect(toYmd(new Date(2026, 0, 5))).toBe('2026-01-05');
		expect(formatShortDate('2026-11-23')).toBe('23 nov');
	});
});
