import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { PageHeaderComponent } from '@intranet-shared/components';
import { SkeletonLoaderComponent } from '@shared/components';
import { EstudianteRendimientoFacade } from './services/estudiante-rendimiento.facade';
import { EstudianteRendimientoChartComponent } from './components/estudiante-rendimiento-chart/estudiante-rendimiento-chart.component';

@Component({
	selector: 'app-estudiante-rendimiento',
	standalone: true,
	imports: [
		CommonModule,
		CardModule,
		ButtonModule,
		PageHeaderComponent,
		SkeletonLoaderComponent,
		EstudianteRendimientoChartComponent,
	],
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
