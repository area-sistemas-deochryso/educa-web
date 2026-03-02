// #region Imports
import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { Menu, MenuModule } from 'primeng/menu';

import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

// #endregion
// #region Implementation
/**
 * Calendar cell state for the month grid.
 */
export interface CalendarDay {
	/** Day number or null for empty cells. */
	day: number | null;
	/** True when the day belongs to the current month. */
	isCurrentMonth: boolean;
	/** True when the day is today. */
	isToday: boolean;
}

@Component({
	selector: 'app-schedule-calendar',
	imports: [CommonModule, MenuModule, TooltipModule],
	templateUrl: './schedule-calendar.component.html',
	styleUrl: './schedule-calendar.component.scss',
})
/**
 * Calendar view with month navigation and day actions.
 */
export class ScheduleCalendarComponent implements OnInit {
	/** Context menu reference for a day. */
	@ViewChild('dayMenu') dayMenu!: Menu;
	/** Emits when user opens the schedule modal. */
	@Output() openSchedule = new EventEmitter<void>();
	/** Emits when user opens the summary modal. */
	@Output() openSummary = new EventEmitter<void>();

	// #region Calendar state
	currentDate = new Date();
	currentMonth: number;
	currentYear: number;
	calendarDays: CalendarDay[] = [];
	selectedDay: number | null = null;
	// #endregion

	// #region Labels
	dayHeaders = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

	monthNames = [
		'ENERO',
		'FEBRERO',
		'MARZO',
		'ABRIL',
		'MAYO',
		'JUNIO',
		'JULIO',
		'AGOSTO',
		'SEPTIEMBRE',
		'OCTUBRE',
		'NOVIEMBRE',
		'DICIEMBRE',
	];
	// #endregion

	menuItems: MenuItem[] = [
		{ label: 'Ver Horarios', command: () => this.openSchedule.emit() },
		{ label: 'Ver Notas / Asistencias', command: () => this.openSummary.emit() },
	];

	constructor() {
		this.currentMonth = this.currentDate.getMonth();
		this.currentYear = this.currentDate.getFullYear();
	}

	/**
	 * Build the initial calendar grid.
	 */
	ngOnInit(): void {
		this.generateCalendar();
	}

	/**
	 * Build a 6x7 grid (42 cells) with leading and trailing days.
	 */
	generateCalendar(): void {
		this.calendarDays = [];
		const firstDay = new Date(this.currentYear, this.currentMonth, 1);
		const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

		let startDayOfWeek = firstDay.getDay() - 1;
		if (startDayOfWeek < 0) startDayOfWeek = 6;

		const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
		for (let i = startDayOfWeek - 1; i >= 0; i--) {
			this.calendarDays.push({
				day: prevMonthLastDay - i,
				isCurrentMonth: false,
				isToday: false,
			});
		}

		const today = new Date();
		for (let day = 1; day <= lastDay.getDate(); day++) {
			const isToday =
				day === today.getDate() &&
				this.currentMonth === today.getMonth() &&
				this.currentYear === today.getFullYear();
			this.calendarDays.push({ day, isCurrentMonth: true, isToday });
		}

		const remainingDays = 42 - this.calendarDays.length;
		for (let day = 1; day <= remainingDays; day++) {
			this.calendarDays.push({ day, isCurrentMonth: false, isToday: false });
		}
	}

	/** Move to the previous month. */
	previousMonth(): void {
		this.currentMonth--;
		if (this.currentMonth < 0) {
			this.currentMonth = 11;
			this.currentYear--;
		}
		this.generateCalendar();
	}

	/** Move to the next month. */
	nextMonth(): void {
		this.currentMonth++;
		if (this.currentMonth > 11) {
			this.currentMonth = 0;
			this.currentYear++;
		}
		this.generateCalendar();
	}

	/**
	 * Display label for the current month and year.
	 */
	get monthYearDisplay(): string {
		return `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
	}

	/**
	 * Select a day and open the context menu.
	 *
	 * @param event Click event.
	 * @param calDay Selected calendar cell.
	 */
	onDayClick(event: Event, calDay: CalendarDay): void {
		this.selectedDay = calDay.day;
		this.dayMenu.toggle(event);
	}

	/**
	 * Jump to the current month and year.
	 */
	goToToday(): void {
		const today = new Date();
		this.currentMonth = today.getMonth();
		this.currentYear = today.getFullYear();
		this.generateCalendar();
	}
}
// #endregion
