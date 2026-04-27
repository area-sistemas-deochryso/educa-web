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

const BOUNCES_CRITICAL_THRESHOLD = 3;

interface DetalleKpiCard {
	readonly key: string;
	readonly label: string;
	readonly value: number;
	readonly sublabel: string;
	readonly icon: string;
	readonly variant: 'danger' | 'warning' | 'info' | 'success';
}

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
	readonly bouncesCriticos = computed(
		() =>
			this.vm().bouncesAcumulados.filter(
				(b) => b.bouncesAcumulados >= BOUNCES_CRITICAL_THRESHOLD,
			).length,
	);
	readonly tiposConFallos = computed(
		() => this.vm().porTipo.filter((t) => t.fallidos > 0).length,
	);

	readonly detalleKpiCards = computed<DetalleKpiCard[]>(() => {
		const fallos = this.totalFallos();
		const bouncers = this.totalBounces();
		const criticos = this.bouncesCriticos();
		const tipos = this.tiposConFallos();
		return [
			{
				key: 'fallos',
				label: 'Fallos del día',
				value: fallos,
				sublabel: fallos === 0 ? 'sin correos en FAILED' : 'correos en estado FAILED',
				icon: 'pi pi-times-circle',
				variant: fallos === 0 ? 'success' : 'danger',
			},
			{
				key: 'bouncers',
				label: 'Bouncers únicos',
				value: bouncers,
				sublabel: bouncers === 0 ? 'sin rebotes acumulados' : 'destinatarios con 2+ rebotes',
				icon: 'pi pi-reply',
				variant: bouncers === 0 ? 'success' : 'warning',
			},
			{
				key: 'criticos',
				label: 'Próximos a blacklist',
				value: criticos,
				sublabel: '≥3 bounces · auto-blacklist al siguiente fallo',
				icon: 'pi pi-exclamation-triangle',
				variant: criticos === 0 ? 'success' : 'danger',
			},
			{
				key: 'tipos',
				label: 'Tipos afectados',
				value: tipos,
				sublabel: tipos === 0 ? 'ningún tipo con fallos' : 'tipos de correo con fallos hoy',
				icon: 'pi pi-tag',
				variant: tipos === 0 ? 'success' : 'info',
			},
		];
	});
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
