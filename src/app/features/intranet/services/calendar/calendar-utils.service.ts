import { Injectable } from '@angular/core';

export interface CalendarDayInfo {
	date: number;
	fullDate: Date;
	isCurrentMonth: boolean;
	isToday: boolean;
	isWeekend: boolean;
}

export interface CalendarMonthInfo {
	name: string;
	year: number;
	month: number;
	days: CalendarDayInfo[];
}

/**
 * Servicio de utilidades de calendario compartido.
 * Proporciona funciones para generar estructuras de calendario correctas
 * que pueden ser usadas por diferentes componentes (calendario, asistencias, etc.)
 */
@Injectable({
	providedIn: 'root',
})
export class CalendarUtilsService {
	readonly monthNames = [
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

	readonly dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

	/**
	 * Genera la información de un mes completo con días del mes anterior y siguiente
	 * para completar una cuadrícula de 6 semanas (42 días)
	 */
	generateMonthDays(year: number, month: number): CalendarDayInfo[] {
		const today = new Date();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDay = firstDay.getDay(); // 0 = Domingo, 1 = Lunes, etc.

		const days: CalendarDayInfo[] = [];

		// Días del mes anterior para completar la primera semana
		const prevMonthLastDay = new Date(year, month, 0).getDate();
		for (let i = startingDay - 1; i >= 0; i--) {
			const date = prevMonthLastDay - i;
			const fullDate = new Date(year, month - 1, date);
			days.push(this.createDayInfo(date, fullDate, false, today));
		}

		// Días del mes actual
		for (let date = 1; date <= daysInMonth; date++) {
			const fullDate = new Date(year, month, date);
			days.push(this.createDayInfo(date, fullDate, true, today));
		}

		// Días del mes siguiente para completar la cuadrícula (42 días = 6 semanas)
		const remainingDays = 42 - days.length;
		for (let date = 1; date <= remainingDays; date++) {
			const fullDate = new Date(year, month + 1, date);
			days.push(this.createDayInfo(date, fullDate, false, today));
		}

		return days;
	}

	/**
	 * Genera las semanas laborables (Lun-Vie) de un mes específico.
	 * Retorna un array de semanas, donde cada semana es un array de 5 elementos (Lun-Vie).
	 * Los días que no pertenecen al mes son null.
	 */
	getWorkWeeksOfMonth(month: number, year: number): (Date | null)[][] {
		// month viene en formato 1-12, convertir a 0-11 para Date
		const monthIndex = month - 1;
		const firstDay = new Date(year, monthIndex, 1);
		const lastDay = new Date(year, monthIndex + 1, 0);
		const daysInMonth = lastDay.getDate();

		const weeks: (Date | null)[][] = [];

		// Encontrar el lunes de la primera semana que contiene días del mes
		const firstDayOfWeek = firstDay.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb

		// Calcular el primer lunes de la semana que contiene el día 1
		let firstMonday: Date;
		if (firstDayOfWeek === 0) {
			// El 1 es domingo, el lunes es el día 2
			firstMonday = new Date(year, monthIndex, 2);
		} else if (firstDayOfWeek === 1) {
			// El 1 es lunes
			firstMonday = new Date(year, monthIndex, 1);
		} else {
			// El 1 es martes-sábado, retroceder al lunes anterior (fuera del mes)
			// pero empezar la semana desde el día 1
			firstMonday = new Date(year, monthIndex, 1 - (firstDayOfWeek - 1));
		}

		let currentMonday = new Date(firstMonday);

		// Iterar mientras el lunes actual pueda tener días del mes
		while (currentMonday.getTime() <= lastDay.getTime()) {
			const week: (Date | null)[] = [];

			// Generar los 5 días laborables (Lun-Vie)
			for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
				const currentDate = new Date(currentMonday);
				currentDate.setDate(currentMonday.getDate() + dayOffset);

				// Verificar si este día pertenece al mes actual
				if (
					currentDate.getMonth() === monthIndex &&
					currentDate.getDate() >= 1 &&
					currentDate.getDate() <= daysInMonth
				) {
					week.push(new Date(currentDate));
				} else {
					week.push(null);
				}
			}

			// Solo agregar la semana si tiene al menos un día válido del mes
			if (week.some((d) => d !== null)) {
				weeks.push(week);
			}

			// Avanzar al siguiente lunes
			currentMonday.setDate(currentMonday.getDate() + 7);
		}

		return weeks;
	}

	/**
	 * Obtiene el nombre del mes (1-12)
	 */
	getMonthName(month: number): string {
		return this.monthNames[month - 1] || '';
	}

	/**
	 * Formatea una fecha como clave única (YYYY-MM-DD)
	 */
	formatDateKey(date: Date): string {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	}

	private createDayInfo(
		date: number,
		fullDate: Date,
		isCurrentMonth: boolean,
		today: Date,
	): CalendarDayInfo {
		const isToday =
			isCurrentMonth &&
			today.getDate() === date &&
			today.getMonth() === fullDate.getMonth() &&
			today.getFullYear() === fullDate.getFullYear();

		return {
			date,
			fullDate,
			isCurrentMonth,
			isToday,
			isWeekend: fullDate.getDay() === 0 || fullDate.getDay() === 6,
		};
	}
}
