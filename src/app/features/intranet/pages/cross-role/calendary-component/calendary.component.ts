// #region Imports
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { CalendarHeaderComponent } from '@features/intranet/components/calendar/calendar-header/calendar-header.component';
import { CalendarLegendComponent } from '@features/intranet/components/calendar/calendar-legend/calendar-legend.component';
import { CalendarMonthViewComponent } from '@features/intranet/components/calendar/calendar-month-view/calendar-month-view.component';
import { CalendarAgendaComponent } from '@features/intranet/components/calendar/calendar-agenda/calendar-agenda.component';
import { CalendarDayModalComponent } from '@features/intranet/components/calendar/calendar-day-modal/calendar-day-modal.component';
import { CalendarDay, CalendarMonth, EntrySelection, ModalData } from './calendar.types';
import { CalendarEvent, getEventFromList, isDateInEventRangeFromList, isDateEventEndFromList } from './events.config';
import { isHoliday } from './holidays.config';
import {
	buildCalendarEntries,
	countEntriesByMonth,
	entriesInMonth,
	entriesOnDay,
	entryToModalData,
	formatShortDate,
} from './calendar-entries.utils';
import { CalendarUtilsService } from '@features/intranet/services/calendar/calendar-utils.service';
import { EventsCalendarService } from '@features/intranet/pages/admin/events-calendar/services';
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
		CalendarMonthViewComponent,
		CalendarAgendaComponent,
		CalendarDayModalComponent,
	],
	templateUrl: './calendary.component.html',
	styleUrl: './calendary.component.scss',
})
export class CalendaryComponent implements OnInit {
	private eventosService = inject(EventsCalendarService);
	private route = inject(ActivatedRoute);
	private calendarUtils = inject(CalendarUtilsService);
	private destroyRef = inject(DestroyRef);

	// #region State
	calendar = signal<CalendarMonth[]>([]);
	currentYear = signal(new Date().getFullYear());
	currentMonth = signal(new Date().getMonth());
	/** Día elegido ('YYYY-MM-DD'); filtra la agenda a ese día. */
	selectedKey = signal<string | null>(null);
	private events = signal<CalendarEvent[]>([]);

	showModal = signal(false);
	modalData = signal<ModalData | null>(null);
	// #endregion

	// #region Derived view state
	readonly entries = computed(() => buildCalendarEntries(this.calendar(), this.events()));
	readonly monthData = computed(() => this.calendar()[this.currentMonth()] ?? null);
	readonly monthCounts = computed(() => countEntriesByMonth(this.entries(), this.currentYear()));
	readonly monthTitle = computed(() => `${this.calendarUtils.monthNames[this.currentMonth()]} ${this.currentYear()}`);

	readonly agendaEntries = computed(() => {
		const key = this.selectedKey();
		return key
			? entriesOnDay(this.entries(), key)
			: entriesInMonth(this.entries(), this.currentYear(), this.currentMonth());
	});

	readonly agendaHeading = computed(() => {
		const key = this.selectedKey();
		if (key) return formatShortDate(key);
		return `Agenda de ${this.calendarUtils.monthNames[this.currentMonth()].toLowerCase()}`;
	});
	// #endregion

	ngOnInit(): void {
		this.applyFragment();
		this.loadEventsFromApi();
	}

	/** `#month-N` abre ese mes. `#today` y sin fragmento abren el mes actual (valor inicial). */
	private applyFragment(): void {
		const match = /^month-(\d{1,2})$/.exec(this.route.snapshot.fragment ?? '');
		if (match && Number(match[1]) < 12) this.currentMonth.set(Number(match[1]));
	}

	// #region Data loading

	/** Fetches events from backend and generates calendar. */
	private loadEventsFromApi(): void {
		const year = this.currentYear();
		this.eventosService.getActivosPorAnio(year).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

	onGoToToday(): void {
		const now = new Date();
		this.selectedKey.set(null);
		this.currentMonth.set(now.getMonth());
		if (this.currentYear() !== now.getFullYear()) {
			this.currentYear.set(now.getFullYear());
			this.loadEventsFromApi();
		}
	}

	onGoToYear(year: number): void {
		this.selectedKey.set(null);
		this.currentYear.set(year);
		this.loadEventsFromApi();
	}

	onGoToMonth(month: number): void {
		this.selectedKey.set(null);
		this.currentMonth.set(month);
	}

	/** Mes anterior o siguiente; al cruzar enero/diciembre cambia de año y recarga. */
	onStepMonth(delta: -1 | 1): void {
		const next = this.currentMonth() + delta;
		if (next < 0 || next > 11) {
			this.onGoToYear(this.currentYear() + delta);
			this.currentMonth.set(next < 0 ? 11 : 0);
			return;
		}
		this.onGoToMonth(next);
	}

	onDaySelect(key: string): void {
		this.selectedKey.update((current) => (current === key ? null : key));
	}

	onClearSelection(): void {
		this.selectedKey.set(null);
	}

	// #endregion

	// #region Modal handlers

	onEntrySelect(selection: EntrySelection): void {
		this.modalData.set(entryToModalData(selection.entry, selection.date));
		this.showModal.set(true);
	}

	onCloseModal(): void {
		this.showModal.set(false);
		this.modalData.set(null);
	}

	// #endregion
}
// #endregion
