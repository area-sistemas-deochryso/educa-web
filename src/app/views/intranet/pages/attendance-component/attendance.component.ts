import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Select } from 'primeng/select';

type AttendanceStatus = 'T' | 'A' | 'F' | 'N';

interface AttendanceDay {
	day: string;
	status: AttendanceStatus;
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
	selectedMonth: string;
	weeks: AttendanceWeek[];
	counts: StatusCounts;
	columnTotals: string[];
	grandTotal: string;
}

interface LegendItem {
	code: string;
	label: string;
	status: AttendanceStatus;
}

@Component({
	selector: 'app-attendance',
	imports: [CommonModule, FormsModule, TableModule, Select],
	templateUrl: './attendance.component.html',
	styleUrl: './attendance.component.scss',
})
export class AttendanceComponent {
	studentName = 'María José Tupac Yupanqui';
	monthOptions = [
		{ label: 'Enero', value: 'Enero' },
		{ label: 'Febrero', value: 'Febrero' },
		{ label: 'Marzo', value: 'Marzo' },
		{ label: 'Abril', value: 'Abril' },
		{ label: 'Mayo', value: 'Mayo' },
		{ label: 'Junio', value: 'Junio' },
		{ label: 'Julio', value: 'Julio' },
		{ label: 'Agosto', value: 'Agosto' },
		{ label: 'Septiembre', value: 'Septiembre' },
		{ label: 'Octubre', value: 'Octubre' },
		{ label: 'Noviembre', value: 'Noviembre' },
		{ label: 'Diciembre', value: 'Diciembre' },
	];
	dayHeaders = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

	legend: LegendItem[] = [
		{ code: 'T', label: 'Temprano', status: 'T' },
		{ code: 'A', label: 'A tiempo', status: 'A' },
		{ code: 'F', label: 'Fuera de horario', status: 'F' },
		{ code: 'N', label: 'No asistió', status: 'N' },
	];

	ingresos: AttendanceTable = this.createTableData(
		`Ingresos de ${this.studentName}`,
		this.generateIngresosData(),
	);

	salidas: AttendanceTable = this.createTableData(
		`Salidas de ${this.studentName}`,
		this.generateSalidasData(),
	);

	private createTableData(title: string, data: AttendanceStatus[][]): AttendanceTable {
		const weeks = this.buildWeeksData(data);
		const counts = this.calculateCounts(weeks);
		const columnTotals = this.calculateColumnTotals(weeks);
		const grandTotal = this.calculateGrandTotal(weeks);
		return {
			title,
			selectedMonth: 'Enero',
			weeks,
			counts,
			columnTotals,
			grandTotal,
		};
	}

	private generateIngresosData(): AttendanceStatus[][] {
		return [
			['F', 'N', 'A', 'T', 'A'],
			['F', 'T', 'N', 'F', 'A'],
			['T', 'A', 'A', 'A', 'T'],
			['T', 'N', 'T', 'N', 'F'],
		];
	}

	private generateSalidasData(): AttendanceStatus[][] {
		return [
			['A', 'F', 'N', 'T', 'A'],
			['T', 'A', 'F', 'N', 'A'],
			['A', 'T', 'A', 'F', 'A'],
			['F', 'A', 'T', 'A', 'A'],
		];
	}

	private buildWeeksData(data: AttendanceStatus[][]): AttendanceWeek[] {
		return data.map((weekData, index) => {
			const days: AttendanceDay[] = weekData.map((status, dayIndex) => ({
				day: this.dayHeaders[dayIndex],
				status,
			}));

			const attended = days.filter((d) => d.status !== 'N').length;

			return {
				week: `Semana ${index + 1}`,
				days,
				total: `${attended}/5`,
			};
		});
	}

	private calculateCounts(weeks: AttendanceWeek[]): StatusCounts {
		const counts: StatusCounts = { T: 0, A: 0, F: 0, N: 0 };

		weeks.forEach((week) => {
			week.days.forEach((day) => {
				counts[day.status]++;
			});
		});

		return counts;
	}

	private calculateColumnTotals(weeks: AttendanceWeek[]): string[] {
		const totals: string[] = [];
		const numDays = weeks[0]?.days.length || 5;

		for (let dayIndex = 0; dayIndex < numDays; dayIndex++) {
			let attended = 0;
			weeks.forEach((week) => {
				if (week.days[dayIndex]?.status !== 'N') {
					attended++;
				}
			});
			totals.push(`${attended}/${weeks.length}`);
		}

		return totals;
	}

	private calculateGrandTotal(weeks: AttendanceWeek[]): string {
		let totalAttended = 0;
		let totalPossible = 0;

		weeks.forEach((week) => {
			week.days.forEach((day) => {
				totalPossible++;
				if (day.status !== 'N') {
					totalAttended++;
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

	onMonthChange(table: AttendanceTable): void {
		const data = this.generateRandomData();
		table.weeks = this.buildWeeksData(data);
		table.counts = this.calculateCounts(table.weeks);
		table.columnTotals = this.calculateColumnTotals(table.weeks);
		table.grandTotal = this.calculateGrandTotal(table.weeks);
	}

	private generateRandomData(): AttendanceStatus[][] {
		const statuses: AttendanceStatus[] = ['T', 'A', 'F', 'N'];
		const data: AttendanceStatus[][] = [];

		for (let week = 0; week < 4; week++) {
			const weekData: AttendanceStatus[] = [];
			for (let day = 0; day < 5; day++) {
				const randomIndex = Math.floor(Math.random() * statuses.length);
				weekData.push(statuses[randomIndex]);
			}
			data.push(weekData);
		}

		return data;
	}
}
