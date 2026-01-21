import { Injectable } from '@angular/core';
import { AsistenciaDetalle } from '@app/services';
import {
	AttendanceStatus,
	AttendanceDay,
	AttendanceWeek,
	AttendanceTable,
	StatusCounts,
} from '../attendance.types';
import { DAY_HEADERS } from '../attendance.config';

@Injectable({
	providedIn: 'root',
})
export class AttendanceDataService {
	createEmptyTable(title: string): AttendanceTable {
		const now = new Date();
		return {
			title,
			selectedMonth: now.getMonth() + 1,
			selectedYear: now.getFullYear(),
			weeks: [],
			counts: { T: 0, A: 0, F: 0, N: 0 },
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
			const dateKey = this.formatDateKey(fecha);
			asistenciaMap.set(dateKey, a);
		});

		const weeks = this.getWeeksOfMonth(mes, anio);
		const ingresosWeeks: AttendanceWeek[] = [];
		const salidasWeeks: AttendanceWeek[] = [];

		weeks.forEach((weekDates, weekIndex) => {
			const ingresosDays: AttendanceDay[] = [];
			const salidasDays: AttendanceDay[] = [];
			let ingresosAttendedCount = 0;
			let salidasAttendedCount = 0;
			let validDaysCount = 0;

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

				validDaysCount++;
				const dateKey = this.formatDateKey(date);
				const asistencia = asistenciaMap.get(dateKey);

				const ingresoStatus = this.getIngresoStatus(asistencia);
				const salidaStatus = this.getSalidaStatus(asistencia);

				if (ingresoStatus !== 'N') ingresosAttendedCount++;
				if (salidaStatus !== 'N') salidasAttendedCount++;

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
				total: `${ingresosAttendedCount}/${validDaysCount}`,
			});

			salidasWeeks.push({
				week: `Semana ${weekIndex + 1}`,
				days: salidasDays,
				total: `${salidasAttendedCount}/${validDaysCount}`,
			});
		});

		return { ingresos: ingresosWeeks, salidas: salidasWeeks };
	}

	private getWeeksOfMonth(mes: number, anio: number): (Date | null)[][] {
		const weeks: (Date | null)[][] = [];
		const firstDay = new Date(anio, mes - 1, 1);
		const lastDay = new Date(anio, mes, 0);

		let currentDate = new Date(firstDay);
		const firstDayOfWeek = currentDate.getDay();

		if (firstDayOfWeek === 0) {
			currentDate.setDate(currentDate.getDate() + 1);
		} else if (firstDayOfWeek !== 1) {
			currentDate.setDate(currentDate.getDate() + (8 - firstDayOfWeek));
		}

		if (currentDate.getMonth() !== mes - 1) {
			currentDate = new Date(firstDay);
		}

		while (currentDate <= lastDay) {
			const week: (Date | null)[] = [];

			for (let i = 0; i < 5; i++) {
				const dayOfWeek = currentDate.getDay();

				if (
					dayOfWeek >= 1 &&
					dayOfWeek <= 5 &&
					currentDate.getMonth() === mes - 1 &&
					currentDate <= lastDay
				) {
					week.push(new Date(currentDate));
				} else if (week.length < 5) {
					week.push(null);
				}

				currentDate.setDate(currentDate.getDate() + 1);

				if (currentDate.getDay() === 6) {
					currentDate.setDate(currentDate.getDate() + 2);
				} else if (currentDate.getDay() === 0) {
					currentDate.setDate(currentDate.getDate() + 1);
				}
			}

			if (week.some((d) => d !== null)) {
				while (week.length < 5) {
					week.push(null);
				}
				weeks.push(week);
			}
		}

		return weeks;
	}

	private formatDateKey(date: Date): string {
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
	}

	private formatHora(fechaHora: string): string {
		const date = new Date(fechaHora);
		return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
	}

	private getIngresoStatus(asistencia: AsistenciaDetalle | undefined): AttendanceStatus {
		if (!asistencia || !asistencia.horaEntrada) {
			return 'N';
		}

		const horaEntrada = new Date(asistencia.horaEntrada);
		const hora = horaEntrada.getHours();
		const minutos = horaEntrada.getMinutes();

		if (hora < 7 || (hora === 7 && minutos < 30)) {
			return 'T';
		} else if (hora === 7 || (hora === 8 && minutos === 0)) {
			return 'A';
		} else {
			return 'F';
		}
	}

	private getSalidaStatus(asistencia: AsistenciaDetalle | undefined): AttendanceStatus {
		if (!asistencia || !asistencia.horaSalida) {
			return 'N';
		}

		const horaSalida = new Date(asistencia.horaSalida);
		const hora = horaSalida.getHours();
		const minutos = horaSalida.getMinutes();

		if (hora > 14 || (hora === 14 && minutos >= 30)) {
			return 'A';
		} else if (hora === 14) {
			return 'T';
		} else {
			return 'F';
		}
	}

	private calculateCounts(weeks: AttendanceWeek[]): StatusCounts {
		const counts: StatusCounts = { T: 0, A: 0, F: 0, N: 0 };

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
				if (week.days[dayIndex]?.date !== null) {
					total++;
					if (week.days[dayIndex]?.status !== 'N') {
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
				if (day.date !== null) {
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
