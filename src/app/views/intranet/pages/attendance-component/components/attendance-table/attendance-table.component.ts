import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { HijoApoderado } from '@app/services';
import { AttendanceTable, AttendanceDay, MonthOption } from '../../attendance.types';
import { MONTH_OPTIONS, DAY_HEADERS, getStatusClass } from '../../attendance.config';

export interface HijoOption {
	label: string;
	value: number;
}

@Component({
	selector: 'app-attendance-table',
	standalone: true,
	imports: [CommonModule, FormsModule, TableModule, Select],
	templateUrl: './attendance-table.component.html',
	styleUrl: './attendance-table.component.scss',
})
export class AttendanceTableComponent {
	table = input.required<AttendanceTable>();

	// Opcional: para selector de hijos integrado
	hijos = input<HijoApoderado[]>([]);
	selectedHijoId = input<number | null>(null);

	monthChange = output<number>();
	hijoChange = output<number>();

	monthOptions: MonthOption[] = MONTH_OPTIONS;
	dayHeaders = DAY_HEADERS;

	getStatusClass = getStatusClass;

	get hijosOptions(): HijoOption[] {
		return this.hijos().map(h => ({
			label: `${h.nombreCompleto} (${h.grado} - ${h.seccion})`,
			value: h.estudianteId,
		}));
	}

	get hasHijos(): boolean {
		return this.hijos().length > 0;
	}

	isDayValid(day: AttendanceDay): boolean {
		return day.date !== null;
	}

	onMonthChange(month: number): void {
		this.monthChange.emit(month);
	}

	onHijoChange(hijoId: number): void {
		this.hijoChange.emit(hijoId);
	}
}
