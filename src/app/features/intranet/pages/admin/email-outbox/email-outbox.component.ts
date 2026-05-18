import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	OnInit,
	inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { StatsSkeletonComponent, TableSkeletonComponent } from '@shared/components';
import { CorrelationIdPillComponent } from '@shared/components/correlation-id-pill';
import { ExcelService } from '@core/services/excel/excel.service';
import { environment } from '@config/environment';
import { EmailHubService } from '@features/intranet/pages/admin/email-outbox-dashboard-dia/services';
import { EmailDeferFailBannerComponent } from '@features/intranet/pages/admin/email-outbox-dashboard-dia/components/email-defer-fail-banner/email-defer-fail-banner.component';
import {
	BlacklistEntryCreatedEvent,
	CandidatoBlacklistDetectadoEvent,
} from '@features/intranet/pages/admin/email-outbox-dashboard-dia/models/email-monitoreo.models';

import { EmailOutboxDataFacade, EmailOutboxUiFacade } from './services';
import { EmailOutboxHeaderComponent } from './components/email-outbox-header/email-outbox-header.component';
import { EmailOutboxStatsComponent } from './components/email-outbox-stats/email-outbox-stats.component';
import { EmailOutboxFiltersComponent } from './components/email-outbox-filters/email-outbox-filters.component';
import { EmailOutboxTableComponent } from './components/email-outbox-table/email-outbox-table.component';
import { EmailOutboxChartComponent } from './components/email-outbox-chart/email-outbox-chart.component';
import { ThrottleStatusWidgetComponent } from './components/throttle-status-widget/throttle-status-widget.component';
import { DeferFailStatusWidgetComponent } from './components/defer-fail-status-widget/defer-fail-status-widget.component';

import { EmailOutboxLista } from '@data/models/email-outbox.models';

@Component({
	selector: 'app-email-outbox',
	standalone: true,
	imports: [
		DrawerModule,
		ToastModule,
		StatsSkeletonComponent,
		TableSkeletonComponent,
		EmailOutboxHeaderComponent,
		EmailOutboxStatsComponent,
		EmailOutboxFiltersComponent,
		EmailOutboxTableComponent,
		EmailOutboxChartComponent,
		ThrottleStatusWidgetComponent,
		DeferFailStatusWidgetComponent,
		EmailDeferFailBannerComponent,
		CorrelationIdPillComponent,
	],
	providers: [MessageService],
	templateUrl: './email-outbox.component.html',
	styleUrl: './email-outbox.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxComponent implements OnInit {
	// #region Dependencias
	private dataFacade = inject(EmailOutboxDataFacade);
	private uiFacade = inject(EmailOutboxUiFacade);
	private excelService = inject(ExcelService);
	private route = inject(ActivatedRoute);
	private router = inject(Router);
	private destroyRef = inject(DestroyRef);
	private hub = inject(EmailHubService);
	private messageService = inject(MessageService);
	// #endregion

	// #region Estado
	readonly vm = this.dataFacade.vm;
	readonly tableSkeletonColumns = EmailOutboxTableComponent.skeletonColumns;
	readonly throttleWidgetEnabled = environment.features.emailOutboxThrottleWidget;
	readonly deferFailWidgetEnabled = environment.features.emailOutboxDeferFailWidget;
	readonly deferAlertsEnabled = environment.features.emailDeferAlerts;
	// #endregion

	// #region Lifecycle
	constructor() {
		// Plan 32 Chat 4 — leer correlationId del query param para deep-link desde
		// el hub. El filter es client-side via computed; basta con setearlo antes
		// del fetch para que la primera lista pintada ya esté filtrada.
		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				this.dataFacade.setFilterCorrelationId(params.get('correlationId'));
			});

		this.dataFacade.loadData();
		if (this.throttleWidgetEnabled) {
			this.dataFacade.initThrottleWidget();
		}
		if (this.deferFailWidgetEnabled) {
			this.dataFacade.initDeferFailWidget();
		}
	}

	ngOnInit(): void {
		// Plan 38 Chat 6 — toasts ante eventos del hub. El banner B9 cross-páginas
		// (Plan 39 Chat D) consume su propia data desde EmailMonitoreoFacade — acá
		// solo escuchamos para mostrar mensajes específicos de bandeja admin.
		if (!this.deferAlertsEnabled) return;

		this.hub.blacklistEntryCreated$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((evt) => this.onBlacklistEntryCreated(evt));

		this.hub.candidatoBlacklistDetectado$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((evt) => this.onCandidatoDetectado(evt));
	}
	// #endregion

	// #region SignalR EmailHub toasts (Plan 38 Chat 6)
	private onBlacklistEntryCreated(evt: BlacklistEntryCreatedEvent): void {
		this.messageService.add({
			key: 'email-outbox-alerts',
			severity: 'warn',
			summary: 'Bloqueo automático',
			detail: `${evt.correoEnmascarado} agregado a la blacklist (${evt.motivo}).`,
			life: 8000,
		});
	}

	private onCandidatoDetectado(evt: CandidatoBlacklistDetectadoEvent): void {
		this.messageService.add({
			key: 'email-outbox-alerts',
			severity: 'info',
			summary: 'Candidato a blacklist',
			detail: `${evt.correoEnmascarado} acumula ${evt.hitsActuales}/${evt.thresholdHits} hits.`,
			life: 6000,
		});
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

	onFilterCorrelationIdChange(correlationId: string | null): void {
		this.dataFacade.onFilterCorrelationIdChange(correlationId);
	}

	onFilterDesdeChange(desde: string | null): void {
		this.dataFacade.onFilterDesdeChange(desde);
	}

	onFilterHastaChange(hasta: string | null): void {
		this.dataFacade.onFilterHastaChange(hasta);
	}

	onClearFilters(): void {
		this.dataFacade.clearFilters();
	}

	onLazyLoad(event: { page: number; pageSize: number }): void {
		this.dataFacade.loadPage(event.page, event.pageSize);
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

	onDeferFailRefresh(): void {
		this.dataFacade.loadDeferFailStatus();
	}

	onDeferFailAutoRefreshChange(enabled: boolean): void {
		this.dataFacade.setDeferFailAutoRefresh(enabled);
	}

	onDeferFailCollapsedChange(collapsed: boolean): void {
		this.dataFacade.setDeferFailCollapsed(collapsed);
	}

	/**
	 * Plan 37 Chat 3 — cross-link desde el widget defer-fail a "Eventos defer".
	 * Pasa `?desde=hoy` para acotar el timeline al día actual.
	 */
	onDeferFailGoToEvents(): void {
		void this.router.navigate(
			['/intranet/admin/monitoreo/correos/defer-events'],
			{ queryParams: { desde: 'hoy' } },
		);
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
