import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	OnDestroy,
	OnInit,
	computed,
	inject,
	signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { StatsSkeletonComponent, TableSkeletonComponent } from '@shared/components';
import { CorrelationIdPillComponent } from '@shared/components/correlation-id-pill';
import { ExcelService } from '@core/services/excel/excel.service';
import { environment } from '@config/environment';
import { logger } from '@core/helpers';
import { EmailHubService } from '@features/intranet/pages/admin/email-outbox-dashboard-dia/services';
import {
	BlacklistEntryCreatedEvent,
	CandidatoBlacklistDetectadoEvent,
	DeferFailStatusUpdatedEvent,
} from '@features/intranet/pages/admin/email-outbox-dashboard-dia/models/email-monitoreo.models';

import { EmailOutboxDataFacade, EmailOutboxUiFacade } from './services';
import { EmailOutboxHeaderComponent } from './components/email-outbox-header/email-outbox-header.component';
import { EmailOutboxStatsComponent } from './components/email-outbox-stats/email-outbox-stats.component';
import { EmailOutboxFiltersComponent } from './components/email-outbox-filters/email-outbox-filters.component';
import { EmailOutboxTableComponent } from './components/email-outbox-table/email-outbox-table.component';
import { EmailOutboxChartComponent } from './components/email-outbox-chart/email-outbox-chart.component';
import { ThrottleStatusWidgetComponent } from './components/throttle-status-widget/throttle-status-widget.component';
import { DeferFailStatusWidgetComponent } from './components/defer-fail-status-widget/defer-fail-status-widget.component';
import {
	DeferFailBannerComponent,
	DeferFailBannerSeverity,
	DeferFailBannerState,
} from './components/defer-fail-banner/defer-fail-banner.component';

import { EmailOutboxLista } from '@data/models/email-outbox.models';

const RECENT_BLACKLIST_TTL_MS = 5 * 60 * 1000;

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
		DeferFailBannerComponent,
		CorrelationIdPillComponent,
	],
	providers: [MessageService],
	templateUrl: './email-outbox.component.html',
	styleUrl: './email-outbox.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxComponent implements OnInit, OnDestroy {
	// #region Dependencias
	private dataFacade = inject(EmailOutboxDataFacade);
	private uiFacade = inject(EmailOutboxUiFacade);
	private excelService = inject(ExcelService);
	private route = inject(ActivatedRoute);
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

	// #region Banner state (Plan 38 Chat 6)
	private readonly _deferFailEvent = signal<DeferFailStatusUpdatedEvent | null>(null);
	private readonly _recentBlacklist = signal<BlacklistEntryCreatedEvent | null>(null);
	private recentBlacklistTimeout: ReturnType<typeof setTimeout> | null = null;

	readonly bannerState = computed<DeferFailBannerState>(() => {
		const evt = this._deferFailEvent();
		const recent = this._recentBlacklist();
		const severity = this.deriveSeverity(evt?.status, recent !== null);
		return {
			visible: severity !== 'info',
			severity,
			contadorActual: evt?.contadorActual ?? null,
			threshold: evt?.threshold ?? null,
			correoEnmascarado: recent?.correoEnmascarado ?? null,
			motivo: recent?.motivo ?? null,
		};
	});
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
		if (!this.deferAlertsEnabled) return;
		this.subscribeHubEvents();
		void this.connectHub();
	}

	ngOnDestroy(): void {
		if (this.recentBlacklistTimeout) {
			clearTimeout(this.recentBlacklistTimeout);
			this.recentBlacklistTimeout = null;
		}
	}
	// #endregion

	// #region SignalR EmailHub (Plan 38 Chat 6)
	private subscribeHubEvents(): void {
		this.hub.blacklistEntryCreated$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((evt) => this.onBlacklistEntryCreated(evt));

		this.hub.deferFailStatusUpdated$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((evt) => this._deferFailEvent.set(evt));

		this.hub.candidatoBlacklistDetectado$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((evt) => this.onCandidatoDetectado(evt));
	}

	private async connectHub(): Promise<void> {
		try {
			await this.hub.connect();
		} catch (err) {
			// INV-S07 — fallo de SignalR no rompe la página. Solo log.
			logger.tagged('EmailOutbox:Hub', 'warn', 'connect_failed', err);
		}
	}

	private onBlacklistEntryCreated(evt: BlacklistEntryCreatedEvent): void {
		this._recentBlacklist.set(evt);
		this.messageService.add({
			key: 'email-outbox-alerts',
			severity: 'warn',
			summary: 'Bloqueo automático',
			detail: `${evt.correoEnmascarado} agregado a la blacklist (${evt.motivo}).`,
			life: 8000,
		});

		if (this.recentBlacklistTimeout) clearTimeout(this.recentBlacklistTimeout);
		this.recentBlacklistTimeout = setTimeout(() => {
			this._recentBlacklist.set(null);
			this.recentBlacklistTimeout = null;
		}, RECENT_BLACKLIST_TTL_MS);
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

	private deriveSeverity(
		status: DeferFailStatusUpdatedEvent['status'] | undefined,
		hasRecentBlacklist: boolean,
	): DeferFailBannerSeverity {
		if (status === 'CRITICAL') return 'danger';
		if (status === 'WARNING') return 'warn';
		if (hasRecentBlacklist) return 'warn';
		return 'info';
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

	onDeferFailRefresh(): void {
		this.dataFacade.loadDeferFailStatus();
	}

	onDeferFailAutoRefreshChange(enabled: boolean): void {
		this.dataFacade.setDeferFailAutoRefresh(enabled);
	}

	onDeferFailCollapsedChange(collapsed: boolean): void {
		this.dataFacade.setDeferFailCollapsed(collapsed);
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
