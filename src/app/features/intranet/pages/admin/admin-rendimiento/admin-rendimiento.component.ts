import { Component, ChangeDetectionStrategy, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

import { PageHeaderComponent, StatsSkeletonComponent, KpiStatsComponent, type KpiStatItem } from '@intranet-shared/components';

import { AdminRendimientoFacade } from './services';
import { AdminRendimientoCursoCardComponent } from './components';

@Component({
	selector: 'app-admin-rendimiento',
	standalone: true,
	imports: [
		CommonModule,
		ButtonModule,
		PageHeaderComponent,
		StatsSkeletonComponent,
		KpiStatsComponent,
		AdminRendimientoCursoCardComponent,
	],
	templateUrl: './admin-rendimiento.component.html',
	styleUrl: './admin-rendimiento.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRendimientoComponent implements OnInit {
	private readonly facade = inject(AdminRendimientoFacade);
	readonly vm = this.facade.vm;

	readonly promedioInstitucionalLabel = computed(() => {
		const promedio = this.vm().kpis.promedioInstitucional;
		return promedio === null ? '—' : promedio.toFixed(1);
	});

	readonly statsItems = computed<KpiStatItem[]>(() => {
		const kpis = this.vm().kpis;
		return [
			{ icon: 'pi pi-book', label: 'Cursos evaluados', value: kpis.totalCursos },
			{
				icon: 'pi pi-exclamation-triangle',
				label: 'Cursos con desvío',
				value: kpis.cursosConOutlier,
				variant: kpis.cursosConOutlier > 0 ? 'warning' : undefined,
			},
			{
				icon: 'pi pi-chart-bar',
				label: 'Promedio institucional',
				value: this.promedioInstitucionalLabel(),
			},
		];
	});

	ngOnInit(): void {
		this.facade.loadRendimiento();
	}

	onRetry(): void {
		this.facade.loadRendimiento();
	}
}
