import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HijoApoderado } from '@data/models';
import {
	AttendanceTable,
	AttendanceDay,
	AttendanceStatus,
	MonthOption,
} from '@features/intranet/pages/cross-role/attendance-component/models/attendance.types';
import {
	MONTH_OPTIONS,
	getStatusClass,
} from '@features/intranet/pages/cross-role/attendance-component/config/attendance.constants';
import { AttendanceTemporalNavComponent } from '../attendance-temporal-nav/attendance-temporal-nav.component';
// Exception (588 retry, F6c): edu-select has no `pt` passthrough input (pt landed on
// edu-select-button only, confirmed missing on edu-select) -- kept on PrimeNG here since
// [pt] is load-bearing a11y (aria-label on the trigger).
import { SelectModule } from 'primeng/select';
import { EduTooltip } from '@edu-ui';

export interface HijoOption {
	label: string;
	shortLabel: string;
	gradeInfo: string;
	value: number;
}

export interface HeatmapCellClick {
	date: Date;
	status: AttendanceStatus;
}

@Component({
	selector: 'app-attendance-heatmap',
	standalone: true,
	imports: [CommonModule, FormsModule, SelectModule, EduTooltip, AttendanceTemporalNavComponent],
	templateUrl: './attendance-heatmap.component.html',
	styleUrl: './attendance-heatmap.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceHeatmapComponent {
	readonly table = input.required<AttendanceTable>();
	readonly icon = input<string>('');
	readonly allowCellClick = input<boolean>(false);
	readonly showSelector = input(true);
	readonly hidePersonName = input(false);
	readonly hideTemporalNav = input(false);
	readonly hijos = input<HijoApoderado[]>([]);
	readonly selectedHijoId = input<number | null>(null);

	readonly monthChange = output<number>();
	readonly hijoChange = output<number>();
	readonly cellClick = output<HeatmapCellClick>();

	readonly monthOptions: MonthOption[] = MONTH_OPTIONS;
	readonly dayHeadersFull = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
	monthSelectVisible = false;
	readonly getStatusClass = getStatusClass;

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

	onMonthChange(month: number): void {
		this.monthChange.emit(month);
	}

	onHijoChange(hijoId: number): void {
		this.hijoChange.emit(hijoId);
	}

	onCellClick(day: AttendanceDay): void {
		if (!this.allowCellClick() || !day.date) return;
		if (day.status === '-' || day.status === 'X' || day.status === 'A') return;
		this.cellClick.emit({ date: day.date, status: day.status });
	}

	isCellClickable(day: AttendanceDay): boolean {
		if (!this.allowCellClick() || !day.date) return false;
		return day.status !== '-' && day.status !== 'X' && day.status !== 'A';
	}

	weekDayTooltip(day: AttendanceDay): string {
		if (!day.date) return '';
		const dateStr = new Intl.DateTimeFormat('es-PE', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
		}).format(day.date);
		const parts = [dateStr, this.statusLabel(day.status)];
		if (day.hora) parts.push(day.hora);
		return parts.join(' · ');
	}

	private statusLabel(status: AttendanceStatus): string {
		const labels: Record<AttendanceStatus, string> = {
			A: 'Asistió',
			T: 'Tardanza',
			F: 'Falta',
			J: 'Justificado',
			'-': 'Pendiente',
			X: 'Sin registro',
		};
		return labels[status] ?? '';
	}

}
