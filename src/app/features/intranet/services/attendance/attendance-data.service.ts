import { Injectable, inject } from '@angular/core';
import { AsistenciaDetalle } from '@core/services';
import {
	AttendanceStatus,
	AttendanceDay,
	AttendanceWeek,
	AttendanceTable,
	StatusCounts,
} from '@features/intranet/pages/attendance-component/models/attendance.types';
import { DAY_HEADERS } from '@features/intranet/pages/attendance-component/config/attendance.constants';
import {
	getIngresoStatusFromTime,
	getSalidaStatusFromTime,
} from '@features/intranet/pages/attendance-component/config/attendance-time.config';
import {
	shouldMarkIngresoAsPending,
	shouldMarkSalidaAsPending,
	isBeforeRegistrationStart,
} from '@features/intranet/pages/attendance-component/config/attendance.utils';
import { shouldCountInasistencia } from '@features/intranet/pages/attendance-component/config/attendance-periods.config';
import { CalendarUtilsService } from '../calendar/calendar-utils.service';

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
			counts: { T: 0, A: 0, F: 0, N: 0, '-': 0, X: 0 },
			columnTotals: [],
			grandTotal: '0/0',
		};
	}

	processAsistencias(
		asistencias: AsistenciaDetalle[],
		month: number,
		year: number,
		studentName: string,
	): { ingresos: AttendanceTable; salidas: AttendanceTable } {
		const { ingresos, salidas } = this.buildWeeksFromAsistencias(asistencias, month, year);

		const ingresosTable = this.createEmptyTable(`Ingresos de ${studentName}`);
		ingresosTable.selectedMonth = month;
		ingresosTable.selectedYear = year;
		ingresosTable.weeks = ingresos;
		ingresosTable.counts = this.calculateCounts(ingresos);
		ingresosTable.columnTotals = this.calculateColumnTotals(ingresos);
		ingresosTable.grandTotal = this.calculateGrandTotal(ingresos);

		const salidasTable = this.createEmptyTable(`Salidas de ${studentName}`);
		salidasTable.selectedMonth = month;
		salidasTable.selectedYear = year;
		salidasTable.weeks = salidas;
		salidasTable.counts = this.calculateCounts(salidas);
		salidasTable.columnTotals = this.calculateColumnTotals(salidas);
		salidasTable.grandTotal = this.calculateGrandTotal(salidas);

		return { ingresos: ingresosTable, salidas: salidasTable };
	}

	private buildWeeksFromAsistencias(
		asistencias: AsistenciaDetalle[],
		mes: number,
		anio: number,
	): { ingresos: AttendanceWeek[]; salidas: AttendanceWeek[] } {
		const asistenciaMap = new Map<string, AsistenciaDetalle>();
		asistencias.forEach((a) => {
			const fecha = new Date(a.fecha);
			const dateKey = this.calendarUtils.formatDateKey(fecha);
			asistenciaMap.set(dateKey, a);
		});

		const weeks = this.calendarUtils.getWorkWeeksOfMonth(mes, anio);
		const ingresosWeeks: AttendanceWeek[] = [];
		const salidasWeeks: AttendanceWeek[] = [];

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
						day: DAY_HEADERS[dayIndex],
						date: null,
						status: 'N',
						hora: null,
					});
					salidasDays.push({
						day: DAY_HEADERS[dayIndex],
						date: null,
						status: 'N',
						hora: null,
					});
					return;
				}

				const dateKey = this.calendarUtils.formatDateKey(date);
				const asistencia = asistenciaMap.get(dateKey);

				const ingresoStatus = this.getIngresoStatus(asistencia, mes, date);
				const salidaStatus = this.getSalidaStatus(asistencia, mes, date);

				// Contar días válidos separadamente para ingresos y salidas
				// Excluir '-' (pendiente) y 'X' (sin registro) del conteo
				if (ingresoStatus !== '-' && ingresoStatus !== 'X') {
					ingresosValidDaysCount++;
					// Solo contar como asistido si tiene registro (T, A, F)
					if (ingresoStatus !== 'N') ingresosAttendedCount++;
				}

				if (salidaStatus !== '-' && salidaStatus !== 'X') {
					salidasValidDaysCount++;
					// Solo contar como asistido si tiene registro (T, A, F)
					if (salidaStatus !== 'N') salidasAttendedCount++;
				}

				ingresosDays.push({
					day: DAY_HEADERS[dayIndex],
					date,
					status: ingresoStatus,
					hora: asistencia?.horaEntrada ? this.formatHora(asistencia.horaEntrada) : null,
				});

				salidasDays.push({
					day: DAY_HEADERS[dayIndex],
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

		return { ingresos: ingresosWeeks, salidas: salidasWeeks };
	}

	private formatHora(fechaHora: string): string {
		const date = new Date(fechaHora);
		return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
	}

	private getIngresoStatus(
		asistencia: AsistenciaDetalle | undefined,
		month: number,
		date: Date,
	): AttendanceStatus {
		if (!asistencia || !asistencia.horaEntrada) {
			// Días antes del inicio del registro (26/01/2026) → 'X' (sin registro)
			if (isBeforeRegistrationStart(date)) return 'X';
			// Días futuros o de hoy sin hora aún → '-' (pendiente)
			if (shouldMarkIngresoAsPending(date, month)) return '-';
			// Durante períodos vacacionales (enero, febrero, julio) → 'X' (no se cuenta)
			if (!shouldCountInasistencia(date)) return 'X';
			// Día pasado sin registro en período académico → 'N' (falta)
			return 'N';
		}

		const horaEntrada = new Date(asistencia.horaEntrada);
		return getIngresoStatusFromTime(horaEntrada.getHours(), horaEntrada.getMinutes(), month);
	}

	private getSalidaStatus(
		asistencia: AsistenciaDetalle | undefined,
		month: number,
		date: Date,
	): AttendanceStatus {
		if (!asistencia || !asistencia.horaSalida) {
			// Días antes del inicio del registro (26/01/2026) → 'X' (sin registro)
			if (isBeforeRegistrationStart(date)) return 'X';
			// Días futuros o de hoy sin hora aún → '-' (pendiente)
			if (shouldMarkSalidaAsPending(date, month)) return '-';
			// Durante períodos vacacionales (enero, febrero, julio) → 'X' (no se cuenta)
			if (!shouldCountInasistencia(date)) return 'X';
			// Día pasado sin registro en período académico → 'N' (falta)
			return 'N';
		}

		const horaSalida = new Date(asistencia.horaSalida);
		return getSalidaStatusFromTime(horaSalida.getHours(), horaSalida.getMinutes(), month);
	}

	private calculateCounts(weeks: AttendanceWeek[]): StatusCounts {
		const counts: StatusCounts = { T: 0, A: 0, F: 0, N: 0, '-': 0, X: 0 };

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

		for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
			let attended = 0;
			let total = 0;
			weeks.forEach((week) => {
				const day = week.days[dayIndex];
				// Excluir días sin fecha, pendientes ('-') y sin registro ('X') del total
				if (day?.date !== null && day?.status !== '-' && day?.status !== 'X') {
					total++;
					if (day?.status !== 'N') {
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
					if (day.status !== 'N') {
						totalAttended++;
					}
				}
			});
		});

		return `${totalAttended}/${totalPossible}`;
	}
}
