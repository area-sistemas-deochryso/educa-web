import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import type {
	PersonaProfesorReporte,
	ReporteFiltrado,
	SalonReporteFiltrado,
} from '../../models';

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

	readonly salones = computed<SalonReporteFiltrado[]>(() =>
		this.resultado().salones.filter((s) => s.totalFiltrados > 0),
	);

	readonly profesores = computed<PersonaProfesorReporte[]>(
		() => this.resultado().profesores ?? [],
	);

	readonly hasProfesores = computed(() => this.profesores().length > 0);

	readonly hasEstudiantes = computed(() => this.salones().length > 0);

	readonly profesoresHeader = computed(() => {
		const r = this.resultado();
		return `Profesores — ${r.totalProfesoresFiltrados ?? this.profesores().length} de ${
			r.totalProfesoresGeneral ?? this.profesores().length
		}`;
	});
	// #endregion
}
