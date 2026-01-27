import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { HijoApoderado } from '@core/services';
import {
	AttendanceTable,
	AttendanceDay,
	MonthOption,
} from '@features/intranet/pages/attendance-component/models/attendance.types';
import {
	MONTH_OPTIONS,
	DAY_HEADERS,
	getStatusClass,
} from '@features/intranet/pages/attendance-component/config/attendance.constants';

export interface HijoOption {
	label: string;
	value: number;
}

@Component({
	selector: 'app-attendance-table',
	standalone: true,
	imports: [DatePipe, FormsModule, TableModule, Select],
	templateUrl: './attendance-table.component.html',
	styleUrl: './attendance-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
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

	// Computed signals para reactividad con OnPush
	readonly hijosOptions = computed<HijoOption[]>(() =>
		this.hijos().map((h) => ({
			label: `${h.nombreCompleto} (${h.grado} - ${h.seccion})`,
			value: h.estudianteId,
		})),
	);

	readonly hasHijos = computed(() => this.hijos().length > 0);

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
