import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CursoChipComponent, PageHeaderComponent } from '@intranet-shared/components';
import { SkeletonLoaderComponent } from '@shared/components';
import { EstudianteRendimientoFacade } from './services/estudiante-rendimiento.facade';
import { EstudianteRendimientoChartComponent } from './components/estudiante-rendimiento-chart/estudiante-rendimiento-chart.component';
import { EduButton, EduCard, EduTag } from '@edu-ui';
import { formatNotaConConfig, getNotaSeverity } from '@intranet-shared/services/calificacion-config';
import { RendimientoCursoVm, RendimientoPeriodoEstudianteDto } from './services/estudiante-rendimiento.models';

@Component({
	selector: 'app-estudiante-rendimiento',
	standalone: true,
	imports: [CursoChipComponent, EduCard, EduButton, EduTag, PageHeaderComponent, SkeletonLoaderComponent, EstudianteRendimientoChartComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estudiante-rendimiento.component.html',
	styleUrl: './estudiante-rendimiento.component.scss',
})
export class EstudianteRendimientoComponent implements OnInit {
	private readonly facade = inject(EstudianteRendimientoFacade);
	readonly vm = this.facade.vm;

	ngOnInit(): void {
		this.facade.loadRendimiento();
	}

	onRetry(): void {
		this.facade.loadRendimiento();
	}

	/** Último periodo con promedio (el KPI "Último promedio" y la tarjeta de un solo punto). */
	ultimoPeriodo(curso: RendimientoCursoVm): RendimientoPeriodoEstudianteDto | null {
		return [...curso.periodos].reverse().find((p) => p.promedio !== null) ?? null;
	}

	/** Letra (escala literal) o nota con 1 decimal (escala numérica), según la escala del curso. */
	formatPromedio(curso: RendimientoCursoVm, promedio: number | null): string {
		return formatNotaConConfig(promedio, curso.escala);
	}

	severity(curso: RendimientoCursoVm, promedio: number | null) {
		return getNotaSeverity(promedio, curso.escala);
	}

	formatDelta(delta: number): string {
		return `${delta > 0 ? '+' : ''}${delta}`;
	}
}
