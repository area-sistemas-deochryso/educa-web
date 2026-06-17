// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Select } from 'primeng/select';
import { Tooltip } from 'primeng/tooltip';
import { HijoApoderado } from '@data/models';
import {
	AttendanceTable,
	AttendanceDay,
	MonthOption,
} from '@features/intranet/pages/cross-role/attendance-component/models/attendance.types';
import {
	MONTH_OPTIONS,
	DAY_HEADERS,
	getStatusClass,
} from '@features/intranet/pages/cross-role/attendance-component/config/attendance.constants';
import { AttendanceTemporalNavComponent } from '../attendance-temporal-nav/attendance-temporal-nav.component';

// #endregion
// #region Implementation
export interface HijoOption {
	label: string;
	shortLabel: string;
	gradeInfo: string;
	value: number;
}

@Component({
	selector: 'app-attendance-table',
	standalone: true,
	imports: [DatePipe, FormsModule, TableModule, Select, Tooltip, AttendanceTemporalNavComponent],
	templateUrl: './attendance-table.component.html',
	styleUrl: './attendance-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceTableComponent {
	// * Table data (weeks + totals) is required.
	table = input.required<AttendanceTable>();

	// * Optional child selector (used by apoderado/profesor/director views).
	hijos = input<HijoApoderado[]>([]);
	selectedHijoId = input<number | null>(null);

	// * Outputs to notify parent of selector changes.
	monthChange = output<number>();
	hijoChange = output<number>();

	monthOptions: MonthOption[] = MONTH_OPTIONS;
	dayHeaders = DAY_HEADERS;
	monthSelectVisible = false;

	getStatusClass = getStatusClass;

	// * Computed signals to keep OnPush template reactive.
	readonly hijosOptions = computed<HijoOption[]>(() =>
		this.hijos().map((h) => ({
			label: `${h.nombreCompleto} (${h.grado} - ${h.seccion})`,
			shortLabel: h.nombreCompleto,
			gradeInfo: `${h.grado} - ${h.seccion}`,
			value: h.estudianteId,
		})),
	);

	readonly hasHijos = computed(() => this.hijos().length > 0);

	readonly currentMonthDate = computed(() => {
		const t = this.table();
		return new Date(t.selectedYear, t.selectedMonth - 1, 1);
	});

	readonly showMonthSelector = computed(() => !this.hasHijos());

	onPreviousMonth(): void {
		const t = this.table();
		const newMonth = t.selectedMonth === 1 ? 12 : t.selectedMonth - 1;
		this.monthChange.emit(newMonth);
	}

	onNextMonth(): void {
		const t = this.table();
		const newMonth = t.selectedMonth === 12 ? 1 : t.selectedMonth + 1;
		this.monthChange.emit(newMonth);
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
// #endregion
