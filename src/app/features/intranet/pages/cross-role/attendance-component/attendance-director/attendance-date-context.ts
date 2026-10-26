import { Injectable, signal } from '@angular/core';

import { AttendanceTable } from '../models/attendance.types';

/**
 * Fecha del día y mes seleccionados, compartidos entre las pestañas por tipo de persona
 * (Estudiantes / Profesores / Asistentes / Coordinadores / …) de la vista del director.
 *
 * Cada pestaña es un componente distinto y se destruye al cambiar, así que su estado local
 * volvía a "hoy" en cada cambio. Cada pestaña lee este contexto al crearse y lo actualiza
 * cuando cambia su fecha o mes.
 *
 * Provisto por `AttendanceDirectorComponent`: vive mientras se esté en la vista.
 */
@Injectable()
export class AttendanceDateContext {
	readonly fechaDia = signal<Date>(new Date());
	readonly month = signal(new Date().getMonth() + 1);
	readonly year = signal(new Date().getFullYear());

	/** Devuelve la tabla con el mes/año compartidos (el resto de la tabla queda igual). */
	withSharedMonth(table: AttendanceTable): AttendanceTable {
		return { ...table, selectedMonth: this.month(), selectedYear: this.year() };
	}

	/** Publica el mes/año de la tabla de ingresos (la referencia de mes de cada pestaña). */
	shareMonthOf(table: AttendanceTable): void {
		this.month.set(table.selectedMonth);
		this.year.set(table.selectedYear);
	}
}
