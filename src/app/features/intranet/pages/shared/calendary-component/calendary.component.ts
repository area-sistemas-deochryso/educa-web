// #region Imports
import { ChangeDetectionStrategy, Component, OnInit, AfterViewInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CalendarHeaderComponent } from '@features/intranet/components/calendar/calendar-header/calendar-header.component';
import { CalendarLegendComponent } from '@features/intranet/components/calendar/calendar-legend/calendar-legend.component';
import { CalendarMonthCardComponent } from '@features/intranet/components/calendar/calendar-month-card/calendar-month-card.component';
import { CalendarDayModalComponent } from '@features/intranet/components/calendar/calendar-day-modal/calendar-day-modal.component';
import { CalendarDay, CalendarMonth, ModalData } from './calendar.types';
import { CalendarEvent, getEventFromList, isDateInEventRangeFromList, isDateEventEndFromList } from './events.config';
import { isHoliday } from './holidays.config';
import { CalendarUtilsService } from '@features/intranet/services/calendar/calendar-utils.service';
import { EventosCalendarioService } from '@features/intranet/pages/admin/eventos-calendario/services';
import { EventoCalendarioActivo } from '@data/models';
import { logger } from '@core/helpers';

// #endregion
// #region Implementation
@Component({
	selector: 'app-calendary.component',
	changeDetection: ChangeDetectionStrategy.OnPush,
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
	private eventosService = inject(EventosCalendarioService);
	private route = inject(ActivatedRoute);
	private calendarUtils = inject(CalendarUtilsService);

	// #region State
	calendar = signal<CalendarMonth[]>([]);
	currentYear = signal(new Date().getFullYear());
	today = new Date();
	private events = signal<CalendarEvent[]>([]);

	showModal = signal(false);
	modalData = signal<ModalData | null>(null);
	// #endregion

	ngOnInit(): void {
		this.loadEventsFromApi();
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

	// #region Data loading

	/** Fetches events from backend and generates calendar. */
	private loadEventsFromApi(): void {
		const year = this.currentYear();
		this.eventosService.getActivosPorAnio(year).subscribe({
			next: (response) => {
				const mapped = (response ?? []).map((e) => this.mapApiToCalendarEvent(e));
				this.events.set(mapped);
				this.generateYearCalendar();
			},
			error: (err) => {
				logger.error('[Calendar] Error loading events from API:', err);
				this.events.set([]);
				this.generateYearCalendar();
			},
		});
	}

	private mapApiToCalendarEvent(e: EventoCalendarioActivo): CalendarEvent {
		return {
			date: e.fechaInicio.substring(0, 10),
			endDate: e.fechaFin ? e.fechaFin.substring(0, 10) : undefined,
			title: e.titulo,
			description: e.descripcion,
			type: e.tipo as CalendarEvent['type'],
			icon: e.icono,
			time: e.hora ?? undefined,
			location: e.ubicacion ?? undefined,
		};
	}

	// #endregion

	// #region Calendar generation

	private generateYearCalendar(): void {
		const year = this.currentYear();
		const months: CalendarMonth[] = [];

		for (let month = 0; month < 12; month++) {
			months.push(this.generateMonth(year, month));
		}

		this.calendar.set(months);
	}

	private generateMonth(year: number, month: number): CalendarMonth {
		const baseDays = this.calendarUtils.generateMonthDays(year, month);
		const eventsList = this.events();

		const days: CalendarDay[] = baseDays.map((dayInfo) =>
			this.createCalendarDay(dayInfo.date, dayInfo.fullDate, dayInfo.isCurrentMonth, dayInfo.isToday, eventsList),
		);

		return {
			name: this.calendarUtils.monthNames[month],
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
		isToday: boolean,
		eventsList: CalendarEvent[],
	): CalendarDay {
		const holiday = isHoliday(fullDate);
		const event = getEventFromList(fullDate, eventsList);
		const rangeEvent = isDateInEventRangeFromList(fullDate, eventsList);
		const endEvent = isDateEventEndFromList(fullDate, eventsList);

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

	// #endregion

	// #region Navigation

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
			this.loadEventsFromApi();
		}
		setTimeout(() => this.scrollToToday(), 100);
	}

	onGoToYear(year: number): void {
		this.currentYear.set(year);
		this.loadEventsFromApi();
	}

	// #endregion

	// #region Modal handlers

	onDayClick(day: CalendarDay): void {
		if (!day.isCurrentMonth) return;

		if (day.isHoliday && day.holiday) {
			this.modalData.set({ type: 'holiday', date: day.fullDate, holiday: day.holiday });
			this.showModal.set(true);
		} else if (day.hasEvent && day.event) {
			this.modalData.set({ type: 'event', date: day.fullDate, event: day.event });
			this.showModal.set(true);
		} else if ((day.isInEventRange || day.isEventEnd) && day.rangeEvent) {
			this.modalData.set({ type: 'event', date: day.fullDate, event: day.rangeEvent });
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

	// #endregion
}
// #endregion
