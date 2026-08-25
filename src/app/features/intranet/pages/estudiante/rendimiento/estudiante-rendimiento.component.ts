import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '@intranet-shared/components';
import { SkeletonLoaderComponent } from '@shared/components';
import { EstudianteRendimientoFacade } from './services/estudiante-rendimiento.facade';
import { EstudianteRendimientoChartComponent } from './components/estudiante-rendimiento-chart/estudiante-rendimiento-chart.component';
import { EduButton, EduCard } from '@edu-ui';

@Component({
	selector: 'app-estudiante-rendimiento',
	standalone: true,
	imports: [CommonModule, EduCard, EduButton, PageHeaderComponent, SkeletonLoaderComponent, EstudianteRendimientoChartComponent],
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
}
