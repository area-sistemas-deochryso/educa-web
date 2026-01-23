import { Component, OnInit, AfterViewInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CalendarHeaderComponent } from '../../components/calendar/calendar-header/calendar-header.component';
import { CalendarLegendComponent } from '../../components/calendar/calendar-legend/calendar-legend.component';
import { CalendarMonthCardComponent } from '../../components/calendar/calendar-month-card/calendar-month-card.component';
import { CalendarDayModalComponent } from '../../components/calendar/calendar-day-modal/calendar-day-modal.component';
import { CalendarDay, CalendarMonth, ModalData } from './calendar.types';
import { isHoliday } from './holidays.config';
import { getEvent, isDateInEventRange, isDateEventEnd } from './events.config';

@Component({
	selector: 'app-calendary.component',
	imports: [
		CalendarHeaderComponent,
		CalendarLegendComponent,
		CalendarMonthCardComponent,
		CalendarDayModalComponent,
	],
	templateUrl: './calendary.component.html',
	styleUrl: './calendary.component.scss',
})
export class CalendaryComponent implements OnInit, AfterViewInit {
	private platformId = inject(PLATFORM_ID);
	private route = inject(ActivatedRoute);

	calendar = signal<CalendarMonth[]>([]);
	currentYear = signal(new Date().getFullYear());
	today = new Date();

	showModal = signal(false);
	modalData = signal<ModalData | null>(null);

	private monthNames = [
		'Enero',
		'Febrero',
		'Marzo',
		'Abril',
		'Mayo',
		'Junio',
		'Julio',
		'Agosto',
		'Septiembre',
		'Octubre',
		'Noviembre',
		'Diciembre',
	];

	ngOnInit(): void {
		this.generateYearCalendar();
	}

	ngAfterViewInit(): void {
		if (isPlatformBrowser(this.platformId)) {
			setTimeout(() => {
				const fragment = this.route.snapshot.fragment;
				if (fragment) {
					this.scrollToElement(fragment);
				} else {
					this.scrollToToday();
				}
			}, 100);
		}
	}

	private generateYearCalendar(): void {
		const year = this.currentYear();
		const months: CalendarMonth[] = [];

		for (let month = 0; month < 12; month++) {
			months.push(this.generateMonth(year, month));
		}

		this.calendar.set(months);
	}

	private generateMonth(year: number, month: number): CalendarMonth {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDay = firstDay.getDay();

		const days: CalendarDay[] = [];

		// Previous month's days
		const prevMonthLastDay = new Date(year, month, 0).getDate();
		for (let i = startingDay - 1; i >= 0; i--) {
			const date = prevMonthLastDay - i;
			const fullDate = new Date(year, month - 1, date);
			days.push(this.createCalendarDay(date, fullDate, false));
		}

		// Current month's days
		for (let date = 1; date <= daysInMonth; date++) {
			const fullDate = new Date(year, month, date);
			const isToday =
				this.today.getDate() === date &&
				this.today.getMonth() === month &&
				this.today.getFullYear() === year;
			days.push(this.createCalendarDay(date, fullDate, true, isToday));
		}

		// Next month's days to complete the grid (6 rows * 7 days = 42)
		const remainingDays = 42 - days.length;
		for (let date = 1; date <= remainingDays; date++) {
			const fullDate = new Date(year, month + 1, date);
			days.push(this.createCalendarDay(date, fullDate, false));
		}

		return {
			name: this.monthNames[month],
			year,
			month,
			days,
			id: `month-${month}`,
		};
	}

	private createCalendarDay(
		date: number,
		fullDate: Date,
		isCurrentMonth: boolean,
		isToday = false,
	): CalendarDay {
		const holiday = isHoliday(fullDate);
		const event = getEvent(fullDate);
		const rangeEvent = isDateInEventRange(fullDate);
		const endEvent = isDateEventEnd(fullDate);

		return {
			date,
			isCurrentMonth,
			isToday,
			isWeekend: fullDate.getDay() === 0 || fullDate.getDay() === 6,
			isHoliday: holiday !== null,
			hasEvent: event !== null,
			isInEventRange: rangeEvent !== null,
			isEventEnd: endEvent !== null,
			holiday,
			event,
			rangeEvent: rangeEvent || endEvent,
			fullDate,
		};
	}

	scrollToToday(): void {
		const todayElement = document.getElementById('today');
		if (todayElement) {
			todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		} else {
			const currentMonth = this.today.getMonth();
			this.scrollToElement(`month-${currentMonth}`);
		}
	}

	scrollToElement(elementId: string): void {
		const element = document.getElementById(elementId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	onGoToToday(): void {
		const todayYear = new Date().getFullYear();
		if (this.currentYear() !== todayYear) {
			this.currentYear.set(todayYear);
			this.generateYearCalendar();
		}
		setTimeout(() => this.scrollToToday(), 100);
	}

	onGoToYear(year: number): void {
		this.currentYear.set(year);
		this.generateYearCalendar();
	}

	onDayClick(day: CalendarDay): void {
		if (!day.isCurrentMonth) return;

		if (day.isHoliday && day.holiday) {
			this.modalData.set({
				type: 'holiday',
				date: day.fullDate,
				holiday: day.holiday,
			});
			this.showModal.set(true);
		} else if (day.hasEvent && day.event) {
			this.modalData.set({
				type: 'event',
				date: day.fullDate,
				event: day.event,
			});
			this.showModal.set(true);
		} else if ((day.isInEventRange || day.isEventEnd) && day.rangeEvent) {
			this.modalData.set({
				type: 'event',
				date: day.fullDate,
				event: day.rangeEvent,
			});
			this.showModal.set(true);
		}
	}

	onCloseModal(): void {
		this.showModal.set(false);
		this.modalData.set(null);
	}

	trackByMonth(_index: number, month: CalendarMonth): string {
		return month.id;
	}
}
