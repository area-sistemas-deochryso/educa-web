import { Component, ChangeDetectionStrategy, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

import { PageHeaderComponent, StatsSkeletonComponent } from '@intranet-shared/components';

import { AdminRendimientoFacade } from './services';
import { AdminRendimientoKpiTileComponent, AdminRendimientoCursoCardComponent } from './components';

@Component({
	selector: 'app-admin-rendimiento',
	standalone: true,
	imports: [
		CommonModule,
		ButtonModule,
		PageHeaderComponent,
		StatsSkeletonComponent,
		AdminRendimientoKpiTileComponent,
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

	ngOnInit(): void {
		this.facade.loadRendimiento();
	}

	onRetry(): void {
		this.facade.loadRendimiento();
	}
}
