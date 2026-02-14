// #region Imports
import { Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { Menu, MenuModule } from 'primeng/menu';

import { CommonModule } from '@angular/common';
import { MenuItem } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

// #endregion
// #region Implementation
export interface CalendarDay {
	day: number | null;
	isCurrentMonth: boolean;
	isToday: boolean;
}

@Component({
	selector: 'app-schedule-calendar',
	imports: [CommonModule, MenuModule, TooltipModule],
	templateUrl: './schedule-calendar.component.html',
	styleUrl: './schedule-calendar.component.scss',
})
export class ScheduleCalendarComponent implements OnInit {
	@ViewChild('dayMenu') dayMenu!: Menu;
	@Output() openSchedule = new EventEmitter<void>();
	@Output() openSummary = new EventEmitter<void>();

	// * Current calendar view state.
	currentDate = new Date();
	currentMonth: number;
	currentYear: number;
	calendarDays: CalendarDay[] = [];
	selectedDay: number | null = null;

	// * Header labels.
	dayHeaders = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'SÃƒÂ¡b', 'Dom'];

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

	menuItems: MenuItem[] = [
		// * Context actions for a day.
		{ label: 'Ver Horarios', command: () => this.openSchedule.emit() },
		{ label: 'Ver Notas / Asistencias', command: () => this.openSummary.emit() },
	];

	constructor() {
		this.currentMonth = this.currentDate.getMonth();
		this.currentYear = this.currentDate.getFullYear();
	}

	ngOnInit(): void {
		this.generateCalendar();
	}

	generateCalendar(): void {
		// * Build a 6x7 grid (42 cells) with leading/trailing days.
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

	previousMonth(): void {
		this.currentMonth--;
		if (this.currentMonth < 0) {
			this.currentMonth = 11;
			this.currentYear--;
		}
		this.generateCalendar();
	}

	nextMonth(): void {
		this.currentMonth++;
		if (this.currentMonth > 11) {
			this.currentMonth = 0;
			this.currentYear++;
		}
		this.generateCalendar();
	}

	get monthYearDisplay(): string {
		return `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
	}

	onDayClick(event: Event, calDay: CalendarDay): void {
		// * Select a day and open the context menu.
		this.selectedDay = calDay.day;
		this.dayMenu.toggle(event);
	}

	goToToday(): void {
		// * Jump to current month/year.
		const today = new Date();
		this.currentMonth = today.getMonth();
		this.currentYear = today.getFullYear();
		this.generateCalendar();
	}
}
// #endregion
