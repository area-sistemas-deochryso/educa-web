import { Component, OnInit, AfterViewInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IntranetBackground } from '../../components/intranet-background/intranet-background';
import { isHoliday, Holiday } from './holidays.config';
import { getEvent, isDateInEventRange, isDateEventEnd, CalendarEvent } from './events.config';

interface CalendarDay {
	date: number;
	isCurrentMonth: boolean;
	isToday: boolean;
	isWeekend: boolean;
	isHoliday: boolean;
	hasEvent: boolean;
	isInEventRange: boolean; // Día intermedio en un rango de evento
	isEventEnd: boolean; // Último día de un rango de evento
	holiday: Holiday | null;
	event: CalendarEvent | null;
	rangeEvent: CalendarEvent | null; // Evento del rango (para días intermedios y finales)
	fullDate: Date;
}

interface CalendarMonth {
	name: string;
	year: number;
	month: number; // 0-indexed
	days: CalendarDay[];
	id: string;
}

interface ModalData {
	type: 'holiday' | 'event';
	date: Date;
	holiday?: Holiday;
	event?: CalendarEvent;
}

@Component({
	selector: 'app-calendary.component',
	imports: [CommonModule, FormsModule, IntranetBackground],
	templateUrl: './calendary.component.html',
	styleUrl: './calendary.component.scss',
})
export class CalendaryComponent implements OnInit, AfterViewInit {
	private platformId = inject(PLATFORM_ID);
	private route = inject(ActivatedRoute);

	calendar = signal<CalendarMonth[]>([]);
	currentYear = signal(new Date().getFullYear());
	searchYear = '';
	today = new Date();

	// Modal
	showModal = signal(false);
	modalData = signal<ModalData | null>(null);

	weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

	monthNames = [
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
		const startingDay = firstDay.getDay(); // 0 = Sunday

		const days: CalendarDay[] = [];

		// Previous month's days
		const prevMonthLastDay = new Date(year, month, 0).getDate();
		for (let i = startingDay - 1; i >= 0; i--) {
			const date = prevMonthLastDay - i;
			const fullDate = new Date(year, month - 1, date);
			const holiday = isHoliday(fullDate);
			const event = getEvent(fullDate);
			const rangeEvent = isDateInEventRange(fullDate);
			const endEvent = isDateEventEnd(fullDate);
			days.push({
				date,
				isCurrentMonth: false,
				isToday: false,
				isWeekend: fullDate.getDay() === 0 || fullDate.getDay() === 6,
				isHoliday: holiday !== null,
				hasEvent: event !== null,
				isInEventRange: rangeEvent !== null,
				isEventEnd: endEvent !== null,
				holiday,
				event,
				rangeEvent: rangeEvent || endEvent,
				fullDate,
			});
		}

		// Current month's days
		for (let date = 1; date <= daysInMonth; date++) {
			const fullDate = new Date(year, month, date);
			const isToday =
				this.today.getDate() === date &&
				this.today.getMonth() === month &&
				this.today.getFullYear() === year;
			const holiday = isHoliday(fullDate);
			const event = getEvent(fullDate);
			const rangeEvent = isDateInEventRange(fullDate);
			const endEvent = isDateEventEnd(fullDate);

			days.push({
				date,
				isCurrentMonth: true,
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
			});
		}

		// Next month's days to complete the grid (6 rows * 7 days = 42)
		const remainingDays = 42 - days.length;
		for (let date = 1; date <= remainingDays; date++) {
			const fullDate = new Date(year, month + 1, date);
			const holiday = isHoliday(fullDate);
			const event = getEvent(fullDate);
			const rangeEvent = isDateInEventRange(fullDate);
			const endEvent = isDateEventEnd(fullDate);
			days.push({
				date,
				isCurrentMonth: false,
				isToday: false,
				isWeekend: fullDate.getDay() === 0 || fullDate.getDay() === 6,
				isHoliday: holiday !== null,
				hasEvent: event !== null,
				isInEventRange: rangeEvent !== null,
				isEventEnd: endEvent !== null,
				holiday,
				event,
				rangeEvent: rangeEvent || endEvent,
				fullDate,
			});
		}

		return {
			name: this.monthNames[month],
			year,
			month,
			days,
			id: `month-${month}`,
		};
	}

	scrollToToday(): void {
		const todayElement = document.getElementById('today');
		if (todayElement) {
			todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		} else {
			// Fallback: scroll to current month
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

	previousYear(): void {
		this.currentYear.update((y) => y - 1);
		this.generateYearCalendar();
	}

	nextYear(): void {
		this.currentYear.update((y) => y + 1);
		this.generateYearCalendar();
	}

	goToToday(): void {
		const todayYear = new Date().getFullYear();
		if (this.currentYear() !== todayYear) {
			this.currentYear.set(todayYear);
			this.generateYearCalendar();
		}
		setTimeout(() => this.scrollToToday(), 100);
	}

	goToYear(): void {
		const year = parseInt(this.searchYear, 10);
		if (!isNaN(year) && year >= 1900 && year <= 2100) {
			this.currentYear.set(year);
			this.generateYearCalendar();
			this.searchYear = '';
		}
	}

	onSearchKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			this.goToYear();
		}
	}

	// Modal methods
	openDayModal(day: CalendarDay): void {
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
			// Abrir modal para días dentro de un rango o el día final
			this.modalData.set({
				type: 'event',
				date: day.fullDate,
				event: day.rangeEvent,
			});
			this.showModal.set(true);
		}
	}

	closeModal(): void {
		this.showModal.set(false);
		this.modalData.set(null);
	}

	onOverlayClick(event: MouseEvent): void {
		if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
			this.closeModal();
		}
	}

	formatDate(date: Date): string {
		return date.toLocaleDateString('es-PE', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}

	getHolidayTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			national: 'Feriado Nacional',
			regional: 'Feriado Regional',
			special: 'Día Especial',
		};
		return labels[type] || type;
	}

	getEventTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			academic: 'Evento Académico',
			cultural: 'Evento Cultural',
			sports: 'Evento Deportivo',
			meeting: 'Reunión',
			other: 'Otro',
		};
		return labels[type] || type;
	}

	trackByMonth(_index: number, month: CalendarMonth): string {
		return month.id;
	}

	trackByDay(index: number, _day: CalendarDay): number {
		return index;
	}
}
