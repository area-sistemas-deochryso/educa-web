import { Holiday } from './holidays.config';
import { CalendarEvent } from './events.config';

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

export interface ModalData {
	type: 'holiday' | 'event';
	date: Date;
	holiday?: Holiday;
	event?: CalendarEvent;
}
