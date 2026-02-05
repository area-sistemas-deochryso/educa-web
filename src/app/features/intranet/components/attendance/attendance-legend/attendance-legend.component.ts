import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { getStatusClass } from '@features/intranet/pages/attendance-component/config/attendance.constants';
import { AsistenciaService, EstadoAsistencia } from '@core/services';

@Component({
	selector: 'app-attendance-legend',
	standalone: true,
	templateUrl: './attendance-legend.component.html',
	styleUrl: './attendance-legend.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceLegendComponent {
	private asistenciaService = inject(AsistenciaService);

	// ✅ NUEVO: Cargar estados desde el backend
	readonly legendItems = signal<EstadoAsistencia[]>([]);

	getStatusClass = getStatusClass;

	constructor() {
		this.loadEstadosValidos();
	}

	private loadEstadosValidos(): void {
		this.asistenciaService.getEstadosValidos().subscribe((estados) => {
			this.legendItems.set(estados);
		});
	}
}
