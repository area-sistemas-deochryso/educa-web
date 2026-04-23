import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TabsModule } from 'primeng/tabs';

import { StatsSkeletonComponent, TableSkeletonComponent } from '@shared/components';
import type { SkeletonColumnDef } from '@shared/components';

import { DashboardBouncersTableComponent } from './components/dashboard-bouncers-table/dashboard-bouncers-table.component';
import { DashboardChartHoraComponent } from './components/dashboard-chart-hora/dashboard-chart-hora.component';
import { DashboardFallosTableComponent } from './components/dashboard-fallos-table/dashboard-fallos-table.component';
import { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header.component';
import { DashboardPorTipoTableComponent } from './components/dashboard-por-tipo-table/dashboard-por-tipo-table.component';
import { DashboardResumenComponent } from './components/dashboard-resumen/dashboard-resumen.component';
import { EmailOutboxDashboardDiaFacade } from './services';

const PORTIPO_SKELETON_COLUMNS: SkeletonColumnDef[] = [
	{ width: 'flex', cellType: 'badge' },
	{ width: '100px', cellType: 'text' },
	{ width: '100px', cellType: 'text' },
	{ width: '100px', cellType: 'text' },
];

const BOUNCERS_SKELETON_COLUMNS: SkeletonColumnDef[] = [
	{ width: 'flex', cellType: 'text' },
	{ width: '90px', cellType: 'badge' },
	{ width: '140px', cellType: 'text' },
	{ width: '220px', cellType: 'text' },
	{ width: '70px', cellType: 'actions' },
];

const FALLOS_SKELETON_COLUMNS: SkeletonColumnDef[] = [
	{ width: '72px', cellType: 'text' },
	{ width: 'flex', cellType: 'text' },
	{ width: '120px', cellType: 'badge' },
	{ width: '160px', cellType: 'badge' },
	{ width: '240px', cellType: 'text' },
	{ width: '92px', cellType: 'text' },
	{ width: '70px', cellType: 'actions' },
];

@Component({
	selector: 'app-email-outbox-dashboard-dia',
	standalone: true,
	imports: [
		TabsModule,
		StatsSkeletonComponent,
		TableSkeletonComponent,
		DashboardHeaderComponent,
		DashboardResumenComponent,
		DashboardChartHoraComponent,
		DashboardPorTipoTableComponent,
		DashboardBouncersTableComponent,
		DashboardFallosTableComponent,
	],
	templateUrl: './email-outbox-dashboard-dia.component.html',
	styleUrl: './email-outbox-dashboard-dia.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxDashboardDiaComponent {
	// #region Dependencias
	private facade = inject(EmailOutboxDashboardDiaFacade);
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
	readonly porTipoSkeletonColumns = PORTIPO_SKELETON_COLUMNS;
	readonly bouncersSkeletonColumns = BOUNCERS_SKELETON_COLUMNS;
	readonly fallosSkeletonColumns = FALLOS_SKELETON_COLUMNS;
	readonly hasData = computed(() => this.vm().dto !== null);
	readonly totalFallos = computed(() => this.vm().resumen?.fallidos ?? 0);
	readonly totalBounces = computed(() => this.vm().bouncesAcumulados.length);
	// #endregion

	// #region Lifecycle
	constructor() {
		this.facade.loadData();
	}
	// #endregion

	// #region Handlers
	onRefresh(): void {
		this.facade.refresh();
	}

	onFechaChange(fecha: string | null): void {
		this.facade.setFecha(fecha);
	}
	// #endregion
}
