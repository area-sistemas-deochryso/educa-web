import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CalendarDay {
	day: number | null;
	isCurrentMonth: boolean;
	isToday: boolean;
}

@Component({
	selector: 'app-schedule',
	imports: [CommonModule],
	templateUrl: './schedule.component.html',
	styleUrl: './schedule.component.scss',
})
export class ScheduleComponent implements OnInit {
	currentDate = new Date();
	currentMonth: number;
	currentYear: number;
	calendarDays: CalendarDay[] = [];

	dayHeaders = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sáb', 'Dom'];

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

	constructor() {
		this.currentMonth = this.currentDate.getMonth();
		this.currentYear = this.currentDate.getFullYear();
	}

	ngOnInit(): void {
		this.generateCalendar();
	}

	generateCalendar(): void {
		this.calendarDays = [];

		// Primer día del mes
		const firstDay = new Date(this.currentYear, this.currentMonth, 1);
		// Último día del mes
		const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);

		// Día de la semana del primer día (0 = Domingo, ajustamos para que Lunes = 0)
		let startDayOfWeek = firstDay.getDay() - 1;
		if (startDayOfWeek < 0) startDayOfWeek = 6; // Si es Domingo, va al final

		// Días del mes anterior para completar la primera semana
		const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
		for (let i = startDayOfWeek - 1; i >= 0; i--) {
			this.calendarDays.push({
				day: prevMonthLastDay - i,
				isCurrentMonth: false,
				isToday: false,
			});
		}

		// Días del mes actual
		const today = new Date();
		for (let day = 1; day <= lastDay.getDate(); day++) {
			const isToday =
				day === today.getDate() &&
				this.currentMonth === today.getMonth() &&
				this.currentYear === today.getFullYear();

			this.calendarDays.push({
				day,
				isCurrentMonth: true,
				isToday,
			});
		}

		// Días del siguiente mes para completar la última semana
		const remainingDays = 42 - this.calendarDays.length; // 6 semanas * 7 días
		for (let day = 1; day <= remainingDays; day++) {
			this.calendarDays.push({
				day,
				isCurrentMonth: false,
				isToday: false,
			});
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
}
