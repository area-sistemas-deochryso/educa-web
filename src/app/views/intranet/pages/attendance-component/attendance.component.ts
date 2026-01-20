import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { AsistenciaService, AsistenciaDetalle, ResumenAsistencia, VoiceRecognitionService } from '@app/services';
import { AuthService } from '@app/services';

type AttendanceStatus = 'T' | 'A' | 'F' | 'N';

interface AttendanceDay {
	day: string;
	date: Date | null;
	status: AttendanceStatus;
	hora?: string | null;
}

interface AttendanceWeek {
	week: string;
	days: AttendanceDay[];
	total: string;
}

interface StatusCounts {
	T: number;
	A: number;
	F: number;
	N: number;
}

interface AttendanceTable {
	title: string;
	selectedMonth: number;
	selectedYear: number;
	weeks: AttendanceWeek[];
	counts: StatusCounts;
	columnTotals: string[];
	grandTotal: string;
}

interface MonthOption {
	label: string;
	value: number;
}

interface LegendItem {
	code: string;
	label: string;
	status: AttendanceStatus;
}

const ATTENDANCE_STORAGE_KEY = 'attendance_selected_month';

@Component({
	selector: 'app-attendance',
	imports: [CommonModule, FormsModule, TableModule, Select, TooltipModule],
	templateUrl: './attendance.component.html',
	styleUrl: './attendance.component.scss',
})
export class AttendanceComponent implements OnInit, OnDestroy {
	private asistenciaService = inject(AsistenciaService);
	private authService = inject(AuthService);
	private cdr = inject(ChangeDetectorRef);
	private voiceService = inject(VoiceRecognitionService);
	private voiceUnsubscribe: (() => void) | null = null;

	studentName = '';
	loading = false;

	// Resumen del backend
	resumen: ResumenAsistencia | null = null;

	monthOptions: MonthOption[] = [
		{ label: 'Enero', value: 1 },
		{ label: 'Febrero', value: 2 },
		{ label: 'Marzo', value: 3 },
		{ label: 'Abril', value: 4 },
		{ label: 'Mayo', value: 5 },
		{ label: 'Junio', value: 6 },
		{ label: 'Julio', value: 7 },
		{ label: 'Agosto', value: 8 },
		{ label: 'Septiembre', value: 9 },
		{ label: 'Octubre', value: 10 },
		{ label: 'Noviembre', value: 11 },
		{ label: 'Diciembre', value: 12 },
	];

	dayHeaders = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

	legend: LegendItem[] = [
		{ code: 'T', label: 'Temprano', status: 'T' },
		{ code: 'A', label: 'A tiempo', status: 'A' },
		{ code: 'F', label: 'Fuera de horario', status: 'F' },
		{ code: 'N', label: 'No asistió', status: 'N' },
	];

	ingresos: AttendanceTable = this.createEmptyTable('Ingresos');
	salidas: AttendanceTable = this.createEmptyTable('Salidas');

	ngOnInit(): void {
		const user = this.authService.currentUser;
		if (user) {
			this.studentName = user.nombreCompleto;
			this.restoreSelectedMonth();
			this.loadAsistencias();
		}
		this.setupVoiceCommands();
	}

	ngOnDestroy(): void {
		if (this.voiceUnsubscribe) {
			this.voiceUnsubscribe();
		}
	}

	private setupVoiceCommands(): void {
		this.voiceUnsubscribe = this.voiceService.onCommand((command, params) => {
			if (command === 'change-month' && params) {
				const month = parseInt(params, 10);
				if (month >= 1 && month <= 12) {
					this.ingresos.selectedMonth = month;
					this.salidas.selectedMonth = month;
					this.saveSelectedMonth();
					this.loadAsistencias();
					this.cdr.detectChanges();
				}
			} else if (command === 'change-year' && params) {
				const year = parseInt(params, 10);
				if (year >= 2000 && year <= 2100) {
					this.ingresos.selectedYear = year;
					this.salidas.selectedYear = year;
					this.saveSelectedMonth();
					this.loadAsistencias();
					this.cdr.detectChanges();
				}
			}
		});
	}

	private restoreSelectedMonth(): void {
		const stored = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
		if (stored) {
			const { month, year } = JSON.parse(stored);
			this.ingresos.selectedMonth = month;
			this.ingresos.selectedYear = year;
			this.salidas.selectedMonth = month;
			this.salidas.selectedYear = year;
		}
	}

	private saveSelectedMonth(): void {
		const data = {
			month: this.ingresos.selectedMonth,
			year: this.ingresos.selectedYear,
		};
		localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(data));
	}

	private createEmptyTable(type: string): AttendanceTable {
		const now = new Date();
		return {
			title: type,
			selectedMonth: now.getMonth() + 1,
			selectedYear: now.getFullYear(),
			weeks: [],
			counts: { T: 0, A: 0, F: 0, N: 0 },
			columnTotals: [],
			grandTotal: '0/0',
		};
	}

	loadAsistencias(): void {
		this.loading = true;
		this.asistenciaService.getMisAsistencias(this.ingresos.selectedMonth, this.ingresos.selectedYear).subscribe({
			next: response => {
				if (response) {
					this.resumen = response;
					this.processAsistencias(response.detalle);
				}
				this.loading = false;
				this.cdr.detectChanges();
			},
			error: () => {
				this.loading = false;
				this.cdr.detectChanges();
			},
		});
	}

	private processAsistencias(asistencias: AsistenciaDetalle[]): void {
		const { ingresos, salidas } = this.buildWeeksFromAsistencias(
			asistencias,
			this.ingresos.selectedMonth,
			this.ingresos.selectedYear
		);

		this.ingresos.title = `Ingresos de ${this.studentName}`;
		this.ingresos.weeks = ingresos;
		this.ingresos.counts = this.calculateCounts(ingresos);
		this.ingresos.columnTotals = this.calculateColumnTotals(ingresos);
		this.ingresos.grandTotal = this.calculateGrandTotal(ingresos);

		this.salidas.title = `Salidas de ${this.studentName}`;
		this.salidas.weeks = salidas;
		this.salidas.counts = this.calculateCounts(salidas);
		this.salidas.columnTotals = this.calculateColumnTotals(salidas);
		this.salidas.grandTotal = this.calculateGrandTotal(salidas);
	}

	private buildWeeksFromAsistencias(
		asistencias: AsistenciaDetalle[],
		mes: number,
		anio: number
	): { ingresos: AttendanceWeek[]; salidas: AttendanceWeek[] } {
		// Crear mapa de asistencias por fecha
		const asistenciaMap = new Map<string, AsistenciaDetalle>();
		asistencias.forEach(a => {
			const fecha = new Date(a.fecha);
			const dateKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
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
					// Día fuera del mes
					ingresosDays.push({ day: this.dayHeaders[dayIndex], date: null, status: 'N', hora: null });
					salidasDays.push({ day: this.dayHeaders[dayIndex], date: null, status: 'N', hora: null });
					return;
				}

				validDaysCount++;
				const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
				const asistencia = asistenciaMap.get(dateKey);

				const ingresoStatus = this.getIngresoStatus(asistencia);
				const salidaStatus = this.getSalidaStatus(asistencia);

				if (ingresoStatus !== 'N') ingresosAttendedCount++;
				if (salidaStatus !== 'N') salidasAttendedCount++;

				ingresosDays.push({
					day: this.dayHeaders[dayIndex],
					date,
					status: ingresoStatus,
					hora: asistencia?.horaEntrada ? this.formatHora(asistencia.horaEntrada) : null,
				});

				salidasDays.push({
					day: this.dayHeaders[dayIndex],
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

		// Encontrar el primer lunes del mes o antes
		let currentDate = new Date(firstDay);
		const firstDayOfWeek = currentDate.getDay();

		// Si el mes no empieza en lunes, retroceder al lunes anterior o avanzar al primer lunes
		if (firstDayOfWeek === 0) {
			// Domingo - avanzar al lunes
			currentDate.setDate(currentDate.getDate() + 1);
		} else if (firstDayOfWeek !== 1) {
			// No es lunes - avanzar al próximo lunes
			currentDate.setDate(currentDate.getDate() + (8 - firstDayOfWeek));
		}

		// Si el primer lunes está fuera del mes, empezar desde el día 1
		if (currentDate.getMonth() !== mes - 1) {
			currentDate = new Date(firstDay);
		}

		while (currentDate <= lastDay) {
			const week: (Date | null)[] = [];

			for (let i = 0; i < 5; i++) {
				const dayOfWeek = currentDate.getDay();

				// Solo días de lunes (1) a viernes (5)
				if (dayOfWeek >= 1 && dayOfWeek <= 5 && currentDate.getMonth() === mes - 1 && currentDate <= lastDay) {
					week.push(new Date(currentDate));
				} else if (week.length < 5) {
					week.push(null); // Día fuera del mes
				}

				currentDate.setDate(currentDate.getDate() + 1);

				// Saltar fin de semana
				if (currentDate.getDay() === 6) {
					currentDate.setDate(currentDate.getDate() + 2);
				} else if (currentDate.getDay() === 0) {
					currentDate.setDate(currentDate.getDate() + 1);
				}
			}

			// Solo agregar semana si tiene al menos un día válido
			if (week.some(d => d !== null)) {
				// Rellenar hasta 5 días
				while (week.length < 5) {
					week.push(null);
				}
				weeks.push(week);
			}
		}

		return weeks;
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

		// Lógica: antes de 7:30 = Temprano, 7:30-8:00 = A tiempo, después = Fuera de horario
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

		// Lógica: 14:30 o después = A tiempo, 14:00-14:29 = Temprano (salió antes), antes de 14:00 = Fuera de horario
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

		weeks.forEach(week => {
			week.days.forEach(day => {
				if (day.date !== null) {
					counts[day.status]++;
				}
			});
		});

		return counts;
	}

	private calculateColumnTotals(weeks: AttendanceWeek[]): string[] {
		const totals: string[] = [];
		const numDays = 5;

		for (let dayIndex = 0; dayIndex < numDays; dayIndex++) {
			let attended = 0;
			let total = 0;
			weeks.forEach(week => {
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

		weeks.forEach(week => {
			week.days.forEach(day => {
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

	getStatusClass(status: AttendanceStatus): string {
		const classes: Record<AttendanceStatus, string> = {
			T: 'status-temprano',
			A: 'status-atiempo',
			F: 'status-fuera',
			N: 'status-no',
		};
		return classes[status];
	}

	isDayValid(day: AttendanceDay): boolean {
		return day.date !== null;
	}

	onMonthChange(table: AttendanceTable): void {
		this.ingresos.selectedMonth = table.selectedMonth;
		this.salidas.selectedMonth = table.selectedMonth;
		this.saveSelectedMonth();
		this.loadAsistencias();
	}
}
