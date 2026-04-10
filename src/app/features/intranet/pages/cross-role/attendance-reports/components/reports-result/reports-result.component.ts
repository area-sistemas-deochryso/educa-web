import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import type { ReporteFiltrado, SalonReporteFiltrado } from '../../models';

interface FilaTabla {
	salon: string;
	dni: string;
	nombreCompleto: string;
	cantidadDias: number;
	horaLlegada: string | null;
	horaSalida: string | null;
	observacion: string | null;
	esCabeceraSalon: boolean;
	salonInfo: SalonReporteFiltrado | null;
}

@Component({
	selector: 'app-reports-result',
	standalone: true,
	imports: [TableModule, DatePipe],
	templateUrl: './reports-result.component.html',
	styleUrl: './reports-result.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsResultComponent {
	// #region Inputs
	readonly resultado = input.required<ReporteFiltrado>();
	// #endregion

	// #region Computed
	readonly esDia = computed(() => this.resultado().rangoTipo === 'dia');

	readonly filas = computed<FilaTabla[]>(() => {
		const result: FilaTabla[] = [];
		for (const salon of this.resultado().salones) {
			if (salon.totalFiltrados === 0) continue;

			result.push({
				salon: `${salon.grado} "${salon.seccion}" — ${salon.totalFiltrados} de ${salon.totalEstudiantes}`,
				dni: '',
				nombreCompleto: '',
				cantidadDias: 0,
				horaLlegada: null,
				horaSalida: null,
				observacion: null,
				esCabeceraSalon: true,
				salonInfo: salon,
			});

			for (const est of salon.estudiantes) {
				result.push({
					salon: `${salon.grado} ${salon.seccion}`,
					dni: est.dni,
					nombreCompleto: est.nombreCompleto,
					cantidadDias: est.cantidadDias,
					horaLlegada: est.horaLlegada,
					horaSalida: est.horaSalida,
					observacion: est.observacion,
					esCabeceraSalon: false,
					salonInfo: null,
				});
			}
		}
		return result;
	});
	// #endregion
}
