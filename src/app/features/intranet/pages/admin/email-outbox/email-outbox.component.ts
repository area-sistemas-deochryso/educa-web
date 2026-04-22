import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';

import { StatsSkeletonComponent, TableSkeletonComponent } from '@shared/components';
import { ExcelService } from '@core/services/excel/excel.service';
import { environment } from '@config/environment';

import { EmailOutboxDataFacade, EmailOutboxUiFacade } from './services';
import { EmailOutboxHeaderComponent } from './components/email-outbox-header/email-outbox-header.component';
import { EmailOutboxStatsComponent } from './components/email-outbox-stats/email-outbox-stats.component';
import { EmailOutboxFiltersComponent } from './components/email-outbox-filters/email-outbox-filters.component';
import { EmailOutboxTableComponent } from './components/email-outbox-table/email-outbox-table.component';
import { EmailOutboxChartComponent } from './components/email-outbox-chart/email-outbox-chart.component';
import { ThrottleStatusWidgetComponent } from './components/throttle-status-widget/throttle-status-widget.component';

import { EmailOutboxLista } from '@data/models/email-outbox.models';

@Component({
	selector: 'app-email-outbox',
	standalone: true,
	imports: [
		DrawerModule,
		StatsSkeletonComponent,
		TableSkeletonComponent,
		EmailOutboxHeaderComponent,
		EmailOutboxStatsComponent,
		EmailOutboxFiltersComponent,
		EmailOutboxTableComponent,
		EmailOutboxChartComponent,
		ThrottleStatusWidgetComponent,
	],
	templateUrl: './email-outbox.component.html',
	styleUrl: './email-outbox.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxComponent {
	// #region Dependencias
	private dataFacade = inject(EmailOutboxDataFacade);
	private uiFacade = inject(EmailOutboxUiFacade);
	private excelService = inject(ExcelService);
	// #endregion

	// #region Estado
	readonly vm = this.dataFacade.vm;
	readonly tableSkeletonColumns = EmailOutboxTableComponent.skeletonColumns;
	readonly throttleWidgetEnabled = environment.features.emailOutboxThrottleWidget;
	// #endregion

	// #region Lifecycle
	constructor() {
		this.dataFacade.loadData();
		if (this.throttleWidgetEnabled) {
			this.dataFacade.initThrottleWidget();
		}
	}
	// #endregion

	// #region Event handlers
	onRefresh(): void {
		this.dataFacade.refresh();
	}

	onSearchChange(term: string): void {
		this.dataFacade.onSearchChange(term);
	}

	onFilterTipoChange(tipo: string | null): void {
		this.dataFacade.onFilterTipoChange(tipo);
	}

	onFilterEstadoChange(estado: string | null): void {
		this.dataFacade.onFilterEstadoChange(estado);
	}

	onFilterTipoFalloChange(tipoFallo: string | null): void {
		this.dataFacade.onFilterTipoFalloChange(tipoFallo);
	}

	onFilterDesdeChange(desde: string | null): void {
		this.dataFacade.onFilterDesdeChange(desde);
	}

	onFilterHastaChange(hasta: string | null): void {
		this.dataFacade.onFilterHastaChange(hasta);
	}

	onViewDetail(item: EmailOutboxLista): void {
		this.uiFacade.openDetail(item);
	}

	onRetry(item: EmailOutboxLista): void {
		this.uiFacade.reintentar(item);
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) {
			this.uiFacade.closeDrawer();
		}
	}

	onThrottleRefresh(): void {
		this.dataFacade.loadThrottleStatus();
	}

	onThrottleAutoRefreshChange(enabled: boolean): void {
		this.dataFacade.setThrottleAutoRefresh(enabled);
	}

	onThrottleCollapsedChange(collapsed: boolean): void {
		this.dataFacade.setThrottleCollapsed(collapsed);
	}

	async onExportExcel(): Promise<void> {
		const items = this.vm().items;
		await this.excelService.exportToXlsx({
			sheetName: 'Correos',
			fileName: `email-outbox-${new Date().toISOString().split('T')[0]}.xlsx`,
			columns: [
				{ header: 'ID', key: 'id', width: 10 },
				{ header: 'Tipo', key: 'tipo', width: 25 },
				{ header: 'Estado', key: 'estado', width: 15 },
				{ header: 'Tipo de fallo', key: 'tipoFallo', width: 25 },
				{ header: 'Destinatario', key: 'destinatario', width: 35 },
				{ header: 'Asunto', key: 'asunto', width: 40 },
				{ header: 'Intentos', key: 'intentos', width: 10 },
				{ header: 'Último Error', key: 'ultimoError', width: 40 },
				{ header: 'Fecha Envío', key: 'fechaEnvio', width: 20 },
				{ header: 'Registrado por', key: 'usuarioReg', width: 20 },
				{ header: 'Fecha Registro', key: 'fechaReg', width: 20 },
			],
			data: items.map((i) => ({
				id: i.id,
				tipo: i.tipo,
				estado: i.estado,
				tipoFallo: i.tipoFallo ?? '',
				destinatario: i.destinatario,
				asunto: i.asunto,
				intentos: `${i.intentos}/${i.maxIntentos}`,
				ultimoError: i.ultimoError ?? '',
				fechaEnvio: i.fechaEnvio ?? '',
				usuarioReg: i.usuarioReg,
				fechaReg: i.fechaReg,
			})),
		});
	}
	// #endregion
}
