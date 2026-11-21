// #region Imports
import { Holiday } from './holidays.config';
import { CalendarEvent } from './events.config';
import { TipoEntradaCalendario } from '@data/models';
import type { EventMarkerKind } from '@shared/components';

// #endregion
// #region Implementation
export interface CalendarDay {
	date: number;
	isCurrentMonth: boolean;
	isToday: boolean;
	isWeekend: boolean;
	isHoliday: boolean;
	hasEvent: boolean;
	isInEventRange: boolean;
	isEventEnd: boolean;
	holiday: Holiday | null;
	event: CalendarEvent | null;
	rangeEvent: CalendarEvent | null;
	fullDate: Date;
}

export interface CalendarMonth {
	name: string;
	year: number;
	month: number;
	days: CalendarDay[];
	id: string;
}

/** Entrada unificada del calendario: un feriado o un evento, con su rango en 'YYYY-MM-DD'. */
export interface CalendarEntry {
	id: string;
	kind: EventMarkerKind;
	title: string;
	start: string;
	end: string | null;
	time?: string;
	location?: string;
	holiday?: Holiday;
	event?: CalendarEvent;
}

export interface EntrySelection {
	entry: CalendarEntry;
	date: Date;
}

export interface ModalData {
	type: TipoEntradaCalendario;
	date: Date;
	holiday?: Holiday;
	event?: CalendarEvent;
}
// #endregion
