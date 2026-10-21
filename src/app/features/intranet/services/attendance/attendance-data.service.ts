// #region Imports
import { Injectable, inject } from '@angular/core';
import { AsistenciaDetalle, ConteoEstados, ConteoEstadosMensual } from '@data/models';
import {
	AttendanceDay,
	AttendanceWeek,
	AttendanceTable,
	StatusCounts,
} from '@features/intranet/pages/cross-role/attendance-component/models/attendance.types';
import {
	DAY_HEADERS,
	DAY_HEADERS_CON_SABADO,
} from '@features/intranet/pages/cross-role/attendance-component/config/attendance.constants';
import { CalendarUtilsService } from '../calendar/calendar-utils.service';

/** Mismo corte que `AsistenciaRules.FechaInicioRegistro` del backend: antes de esta fecha no hay registro. */
const FECHA_INICIO_REGISTRO = new Date(2026, 0, 26);

// #endregion
// #region Implementation
@Injectable({
	providedIn: 'root',
})
export class AttendanceDataService {
	private calendarUtils = inject(CalendarUtilsService);

	createEmptyTable(title: string): AttendanceTable {
		const now = new Date();
		return {
			title,
			selectedMonth: now.getMonth() + 1,
			selectedYear: now.getFullYear(),
			weeks: [],
			counts: { T: 0, A: 0, F: 0, J: 0, '-': 0, X: 0 },
			columnTotals: [],
			grandTotal: '0/0',
		};
	}

	processAsistencias(
		asistencias: AsistenciaDetalle[],
		month: number,
		year: number,
		studentName: string,
		conteoEstados?: ConteoEstadosMensual,
		feriados?: string[],
	): { ingresos: AttendanceTable; salidas: AttendanceTable } {
		const { ingresos, salidas, dayHeaders, faltasSinRegistro } = this.buildWeeksFromAsistencias(
			asistencias,
			month,
			year,
			feriados,
		);

		const ingresosTable = this.createEmptyTable(`Ingresos de ${studentName}`);
		ingresosTable.selectedMonth = month;
		ingresosTable.selectedYear = year;
		ingresosTable.weeks = ingresos;
		ingresosTable.counts = conteoEstados
			? this.mapConteoToStatusCounts(conteoEstados.ingresos, faltasSinRegistro)
			: this.calculateCounts(ingresos);
		ingresosTable.columnTotals = this.calculateColumnTotals(ingresos);
		ingresosTable.grandTotal = this.calculateGrandTotal(ingresos);
		ingresosTable.dayHeaders = dayHeaders;

		const salidasTable = this.createEmptyTable(`Salidas de ${studentName}`);
		salidasTable.selectedMonth = month;
		salidasTable.selectedYear = year;
		salidasTable.weeks = salidas;
		salidasTable.counts = conteoEstados
			? this.mapConteoToStatusCounts(conteoEstados.salidas, faltasSinRegistro)
			: this.calculateCounts(salidas);
		salidasTable.columnTotals = this.calculateColumnTotals(salidas);
		salidasTable.grandTotal = this.calculateGrandTotal(salidas);
		salidasTable.dayHeaders = dayHeaders;

		return { ingresos: ingresosTable, salidas: salidasTable };
	}

	/**
	 * Estado de un día SIN registro: F si es día hábil (lun-vie) ya pasado y no es feriado;
	 * en cualquier otro caso (hoy, futuro, fin de semana, feriado, antes del registro) 'X' (no contabilizado).
	 * Espejo de `EstadoDiaSinRegistro` del backend.
	 */
	private estadoDiaSinRegistro(date: Date, feriadoKeys: Set<string>): 'F' | 'X' {
		const dow = date.getDay();
		if (dow === 0 || dow === 6) return 'X';

		const hoy = new Date();
		hoy.setHours(0, 0, 0, 0);
		if (date >= hoy) return 'X';
		if (date < FECHA_INICIO_REGISTRO) return 'X';
		if (feriadoKeys.has(this.calendarUtils.formatDateKey(date))) return 'X';

		return 'F';
	}

	private buildWeeksFromAsistencias(
		asistencias: AsistenciaDetalle[],
		mes: number,
		anio: number,
		feriados: string[] | undefined,
	): {
		ingresos: AttendanceWeek[];
		salidas: AttendanceWeek[];
		dayHeaders: string[];
		faltasSinRegistro: number;
	} {
		const asistenciaMap = new Map<string, AsistenciaDetalle>();
		let tieneSabado = false;
		asistencias.forEach((a) => {
			const fecha = new Date(a.fecha);
			const dateKey = this.calendarUtils.formatDateKey(fecha);
			asistenciaMap.set(dateKey, a);
			// INV-C14: el sábado es día posible; la columna aparece solo si hay registro ese día.
			if (fecha.getDay() === 6) tieneSabado = true;
		});

		// Sin lista de feriados (undefined) no se puede distinguir un feriado de una falta: no se infiere F.
		const feriadoKeys = new Set(
			(feriados ?? []).map((f) => this.calendarUtils.formatDateKey(new Date(f))),
		);
		const dayHeaders = tieneSabado ? DAY_HEADERS_CON_SABADO : DAY_HEADERS;
		const weeks = this.calendarUtils.getWorkWeeksOfMonth(mes, anio, tieneSabado);
		const ingresosWeeks: AttendanceWeek[] = [];
		const salidasWeeks: AttendanceWeek[] = [];
		let faltasSinRegistro = 0;

		weeks.forEach((weekDates, weekIndex) => {
			const ingresosDays: AttendanceDay[] = [];
			const salidasDays: AttendanceDay[] = [];
			let ingresosAttendedCount = 0;
			let salidasAttendedCount = 0;
			let ingresosValidDaysCount = 0;
			let salidasValidDaysCount = 0;

			weekDates.forEach((date, dayIndex) => {
				if (date === null) {
					ingresosDays.push({
						day: dayHeaders[dayIndex],
						date: null,
						status: 'F',
						hora: null,
					});
					salidasDays.push({
						day: dayHeaders[dayIndex],
						date: null,
						status: 'F',
						hora: null,
					});
					return;
				}

				const dateKey = this.calendarUtils.formatDateKey(date);
				const asistencia = asistenciaMap.get(dateKey);

				// ✅ NUEVO: Usar estados calculados desde el backend
				// Día sin registro: F si fue día hábil pasado no feriado (el backend no manda esa fila).
				const sinRegistro =
					asistencia || feriados === undefined ? null : this.estadoDiaSinRegistro(date, feriadoKeys);
				if (sinRegistro === 'F') faltasSinRegistro++;
				const ingresoStatus = asistencia?.estadoIngreso || sinRegistro || 'X';
				const salidaStatus = asistencia?.estadoSalida || sinRegistro || 'X';

				// Contar días válidos separadamente para ingresos y salidas
				// Excluir '-' (pendiente) y 'X' (sin registro) del conteo
				if (ingresoStatus !== '-' && ingresoStatus !== 'X') {
					ingresosValidDaysCount++;
					// Solo contar como asistido si tiene registro (T, A, no F)
					if (ingresoStatus !== 'F') ingresosAttendedCount++;
				}

				if (salidaStatus !== '-' && salidaStatus !== 'X') {
					salidasValidDaysCount++;
					// Solo contar como asistido si tiene registro (T, A, no F)
					if (salidaStatus !== 'F') salidasAttendedCount++;
				}

				ingresosDays.push({
					day: dayHeaders[dayIndex],
					date,
					status: ingresoStatus,
					hora: asistencia?.horaEntrada ? this.formatHora(asistencia.horaEntrada) : null,
				});

				salidasDays.push({
					day: dayHeaders[dayIndex],
					date,
					status: salidaStatus,
					hora: asistencia?.horaSalida ? this.formatHora(asistencia.horaSalida) : null,
				});
			});

			ingresosWeeks.push({
				week: `Semana ${weekIndex + 1}`,
				days: ingresosDays,
				total: `${ingresosAttendedCount}/${ingresosValidDaysCount}`,
			});

			salidasWeeks.push({
				week: `Semana ${weekIndex + 1}`,
				days: salidasDays,
				total: `${salidasAttendedCount}/${salidasValidDaysCount}`,
			});
		});

		return { ingresos: ingresosWeeks, salidas: salidasWeeks, dayHeaders, faltasSinRegistro };
	}

	private formatHora(fechaHora: string): string {
		const date = new Date(fechaHora);
		return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
	}

	// * Mapea conteo del backend (campos nombrados) a StatusCounts (keyed por código).
	// El backend solo cuenta días con registro; `faltasSinRegistro` suma los días hábiles pasados sin registro.
	private mapConteoToStatusCounts(conteo: ConteoEstados, faltasSinRegistro = 0): StatusCounts {
		return {
			T: conteo.tardanza,
			A: conteo.asistio,
			F: conteo.falta + faltasSinRegistro,
			J: conteo.justificado,
			'-': conteo.pendiente,
			X: 0,
		};
	}

	private calculateCounts(weeks: AttendanceWeek[]): StatusCounts {
		const counts: StatusCounts = { T: 0, A: 0, F: 0, J: 0, '-': 0, X: 0 };

		weeks.forEach((week) => {
			week.days.forEach((day) => {
				if (day.date !== null) {
					counts[day.status]++;
				}
			});
		});

		return counts;
	}

	private calculateColumnTotals(weeks: AttendanceWeek[]): string[] {
		const totals: string[] = [];

		const diasPorSemana = weeks[0]?.days.length ?? 5;
		for (let dayIndex = 0; dayIndex < diasPorSemana; dayIndex++) {
			let attended = 0;
			let total = 0;
			weeks.forEach((week) => {
				const day = week.days[dayIndex];
				// Excluir días sin fecha, pendientes ('-') y sin registro ('X') del total
				if (day?.date !== null && day?.status !== '-' && day?.status !== 'X') {
					total++;
					if (day?.status !== 'F') {
						attended++;
					}
				}
			});
			totals.push(`${attended}/${total}`);
		}

		return totals;
	}

	private calculateGrandTotal(weeks: AttendanceWeek[]): string {
		let totalAttended = 0;
		let totalPossible = 0;

		weeks.forEach((week) => {
			week.days.forEach((day) => {
				// Excluir días sin fecha, pendientes ('-') y sin registro ('X') del total
				if (day.date !== null && day.status !== '-' && day.status !== 'X') {
					totalPossible++;
					if (day.status !== 'F') {
						totalAttended++;
					}
				}
			});
		});

		return `${totalAttended}/${totalPossible}`;
	}
}
// #endregion
