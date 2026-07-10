import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { EstadisticasAsistenciaDia } from '@data/models';
import { AttendanceStatus } from '@features/intranet/pages/cross-role/attendance-component/models/attendance.types';
import { getStatusClass } from '@features/intranet/pages/cross-role/attendance-component/config/attendance.constants';

export interface StatusFilterState {
	searchTerm: string;
	activeStatus: AttendanceStatus | null;
}

interface StatusChip {
	code: AttendanceStatus;
	label: string;
	count: number;
}

@Component({
	selector: 'app-attendance-status-filter',
	standalone: true,
	imports: [FormsModule, TooltipModule, InputTextModule],
	templateUrl: './attendance-status-filter.component.html',
	styleUrl: './attendance-status-filter.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceStatusFilterComponent {
	readonly estadisticas = input.required<EstadisticasAsistenciaDia>();
	readonly filterState = model.required<StatusFilterState>();

	readonly getStatusClass = getStatusClass;

	readonly chips = computed<StatusChip[]>(() => {
		const stats = this.estadisticas();
		return [
			{ code: 'A' as AttendanceStatus, label: 'Asistió', count: stats.asistio },
			{ code: 'T' as AttendanceStatus, label: 'Tardanza', count: stats.tardanza },
			{ code: 'F' as AttendanceStatus, label: 'Falta', count: stats.falta },
			{ code: 'J' as AttendanceStatus, label: 'Justificado', count: stats.justificado },
			{ code: '-' as AttendanceStatus, label: 'Pendiente', count: stats.pendiente },
		];
	});

	onSearchChange(term: string): void {
		this.filterState.update((s) => ({ ...s, searchTerm: term }));
	}

	onChipClick(code: AttendanceStatus): void {
		this.filterState.update((s) => ({
			...s,
			activeStatus: s.activeStatus === code ? null : code,
		}));
	}

	isActive(code: AttendanceStatus): boolean {
		return this.filterState().activeStatus === code;
	}
}
