import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { getStatusClass } from '@features/intranet/pages/cross-role/attendance-component/config/attendance.constants';
import { AttendanceStatus } from '@features/intranet/pages/cross-role/attendance-component/models/attendance.types';
import { AttendanceService } from '@intranet-shared/services';
import { EstadoAsistencia, EstadisticasAsistenciaDia } from '@data/models';

@Component({
	selector: 'app-attendance-legend-stats',
	standalone: true,
	templateUrl: './attendance-legend-stats.component.html',
	styleUrl: './attendance-legend-stats.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceLegendStatsComponent {
	private readonly asistenciaService = inject(AttendanceService);

	readonly estadisticas = input<EstadisticasAsistenciaDia | null>(null);
	readonly activeStatus = model<AttendanceStatus | null>(null);
	readonly legendItems = signal<EstadoAsistencia[]>([]);

	getStatusClass = getStatusClass;

	constructor() {
		this.asistenciaService.getEstadosValidos().subscribe((estados) => {
			this.legendItems.set(estados);
		});
	}

	getCount(codigo: string): number | null {
		const stats = this.estadisticas();
		if (!stats) return null;
		const map: Record<string, number> = {
			A: stats.asistio,
			T: stats.tardanza,
			F: stats.falta,
			J: stats.justificado,
			'-': stats.pendiente,
		};
		return map[codigo] ?? null;
	}

	onItemClick(codigo: string): void {
		const status = codigo as AttendanceStatus;
		this.activeStatus.set(this.activeStatus() === status ? null : status);
	}

	isActive(codigo: string): boolean {
		return this.activeStatus() === codigo;
	}
}
