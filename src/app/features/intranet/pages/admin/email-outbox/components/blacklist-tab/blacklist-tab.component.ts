import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	OnInit,
	inject,
	signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { MiniSparklineComponent, TableSkeletonComponent } from '@intranet-shared/components';
import { environment } from '@config/environment';
import { EmailHubService } from '@features/intranet/pages/admin/email-outbox-dashboard-dia/services';
import { EmailDeferFailBannerComponent } from '@features/intranet/pages/admin/email-outbox-dashboard-dia/components/email-defer-fail-banner/email-defer-fail-banner.component';
import {
	BlacklistEntryCreatedEvent,
	CandidatoBlacklistDetectadoEvent,
} from '@features/intranet/pages/admin/email-outbox-dashboard-dia/models/email-monitoreo.models';
import {
	CrearBlacklistRequest,
	EmailBlacklistEntry,
	EmailBlacklistFiltroEstado,
	EmailBlacklistMotivo,
} from '@data/models';

import {
	BlacklistCrudFacade,
	BlacklistDataFacade,
	BlacklistUiFacade,
} from '../../services';
import { trendSummary, TrendSummary } from '../../utils/trend-summary';
import { BlacklistTableComponent } from '../blacklist-table/blacklist-table.component';
import { BlacklistAddDialogComponent } from '../blacklist-add-dialog/blacklist-add-dialog.component';
import { BlacklistDetailDrawerComponent } from '../blacklist-detail-drawer/blacklist-detail-drawer.component';

interface SelectOption<T> {
	label: string;
	value: T;
}

const ESTADO_OPTIONS: SelectOption<EmailBlacklistFiltroEstado>[] = [
	{ label: 'Activa', value: 'activa' },
	{ label: 'Despejada', value: 'inactiva' },
];

const MOTIVO_OPTIONS: SelectOption<EmailBlacklistMotivo>[] = [
	{ label: 'Bounce permanente 5.x.x', value: 'BOUNCE_5XX' },
	{ label: 'Buzón lleno crónico (4.2.2)', value: 'BOUNCE_MAILBOX_FULL' },
	{ label: 'Bloqueo manual', value: 'MANUAL' },
	{ label: 'Carga masiva', value: 'BULK_IMPORT' },
	{ label: 'Formato inválido', value: 'FORMAT_INVALID' },
];

/**
 * Plan 38 Chat 5 — Smart container del tab "Blacklist".
 *
 * Orquesta filtros + tabla + dialog + drawer. Lee `?correo=...&action=add`
 * del query param para prefill del dialog (cross-link Plan 39 Chat C).
 */
@Component({
	selector: 'app-blacklist-tab',
	standalone: true,
	imports: [
		DecimalPipe,
		FormsModule,
		ButtonModule,
		InputTextModule,
		TextareaModule,
		SelectModule,
		TooltipModule,
		ToastModule,
		ConfirmDialogModule,
		DialogModule,
		TableSkeletonComponent,
		MiniSparklineComponent,
		EmailDeferFailBannerComponent,
		BlacklistTableComponent,
		BlacklistAddDialogComponent,
		BlacklistDetailDrawerComponent,
	],
	providers: [ConfirmationService, MessageService],
	templateUrl: './blacklist-tab.component.html',
	styleUrl: './blacklist-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlacklistTabComponent implements OnInit {
	// #region Dependencias
	private readonly dataFacade = inject(BlacklistDataFacade);
	private readonly crudFacade = inject(BlacklistCrudFacade);
	private readonly uiFacade = inject(BlacklistUiFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);
	private readonly confirmationService = inject(ConfirmationService);
	private readonly hub = inject(EmailHubService);
	private readonly messageService = inject(MessageService);
	// #endregion

	// #region Estado
	readonly vm = this.dataFacade.vm;
	readonly skeletonColumns = BlacklistTableComponent.skeletonColumns;
	readonly estadoOptions = ESTADO_OPTIONS;
	readonly motivoOptions = MOTIVO_OPTIONS;
	readonly deferAlertsEnabled = environment.features.emailDeferAlerts;

	readonly unblockDialogVisible = signal(false);
	readonly unblockMotivo = signal('');
	private unblockTarget: EmailBlacklistEntry | null = null;

	readonly MIN_MOTIVO_LENGTH = 20;

	readonly trendSummaryValue = computed<TrendSummary>(() => trendSummary(this.vm().trend));
	// #endregion

	ngOnInit(): void {
		this.dataFacade.loadData();
		this.dataFacade.loadTrend();

		// Cross-link Plan 39 Chat C: prefill del dialog cuando se navega
		// con `?action=add&correo=...` desde el dashboard.
		this.route.queryParamMap
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((params) => {
				const action = params.get('action');
				const correo = params.get('correo');
				if (action === 'add' && correo) {
					this.uiFacade.openAddDialog(correo);
				}
			});

		if (!this.deferAlertsEnabled) return;

		this.hub.blacklistEntryCreated$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((evt) => this.onBlacklistEntryCreated(evt));

		this.hub.candidatoBlacklistDetectado$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((evt) => this.onCandidatoDetectado(evt));
	}

	// #region Search / filtros
	onSearchChange(term: string): void {
		this.dataFacade.onSearchChange(term);
	}

	onFilterEstadoChange(value: EmailBlacklistFiltroEstado | null): void {
		this.dataFacade.onFilterEstadoChange(value);
	}

	onFilterMotivoChange(value: EmailBlacklistMotivo | null): void {
		this.dataFacade.onFilterMotivoChange(value);
	}

	onClearFiltros(): void {
		this.dataFacade.clearFiltros();
	}

	onRefresh(): void {
		this.dataFacade.refresh();
	}
	// #endregion

	// #region Tabla
	onLazyLoad(event: TableLazyLoadEvent): void {
		const first = event.first ?? 0;
		const rows = event.rows ?? this.vm().pageSize;
		const page = Math.floor(first / rows) + 1;
		if (page === this.vm().page && rows === this.vm().pageSize) return;
		this.dataFacade.loadPage(page, rows);
	}

	onViewDetail(item: EmailBlacklistEntry): void {
		this.uiFacade.openDetailDrawer(item);
	}
	// #endregion

	// #region Despejar (con confirm)
	onDespejar(item: EmailBlacklistEntry): void {
		this.confirmationService.confirm({
			header: 'Despejar bloqueo',
			message: `¿Estás seguro de despejar el bloqueo de "${item.correo}"? El correo volverá a recibir intentos de envío.`,
			acceptLabel: 'Despejar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-warning',
			rejectButtonStyleClass: 'p-button-text',
			icon: 'pi pi-exclamation-triangle',
			accept: () => this.crudFacade.despejar(item),
		});
	}
	// #endregion

	// #region Desbloquear (con motivo)
	onUnblock(item: EmailBlacklistEntry): void {
		this.unblockTarget = item;
		this.unblockMotivo.set('');
		this.unblockDialogVisible.set(true);
	}

	onUnblockDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.unblockDialogVisible.set(false);
			this.unblockTarget = null;
		}
	}

	onUnblockMotivoChange(value: string): void {
		this.unblockMotivo.set(value);
	}

	onUnblockConfirm(): void {
		if (!this.unblockTarget || this.unblockMotivo().length < this.MIN_MOTIVO_LENGTH) return;
		this.crudFacade.unblock(this.unblockTarget, this.unblockMotivo());
		this.unblockDialogVisible.set(false);
		this.unblockTarget = null;
	}

	onUnblockCancel(): void {
		this.unblockDialogVisible.set(false);
		this.unblockTarget = null;
	}
	// #endregion

	// #region Dialog "Agregar"
	onOpenAddDialog(): void {
		this.uiFacade.openAddDialog();
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeDialog();
	}

	onDialogCorreoChange(value: string): void {
		this.dataFacade.updateFormCorreo(value);
	}

	onDialogMotivoChange(value: EmailBlacklistMotivo | null): void {
		this.dataFacade.updateFormMotivo(value);
	}

	onDialogObservacionChange(value: string): void {
		this.dataFacade.updateFormObservacion(value);
	}

	onDialogConfirm(request: CrearBlacklistRequest): void {
		this.crudFacade.crear(request);
	}

	onDialogCancel(): void {
		this.uiFacade.closeDialog();
	}
	// #endregion

	// #region Drawer detalle
	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeDetailDrawer();
	}

	onDrawerClose(): void {
		this.uiFacade.closeDetailDrawer();
	}

	onDrawerDespejar(item: EmailBlacklistEntry): void {
		this.onDespejar(item);
	}
	// #endregion

	// #region Export CSV
	onExportCsv(): void {
		const items = this.vm().items;
		if (items.length === 0) return;

		const rows = [
			['id', 'correo', 'motivo', 'motivoLabel', 'estado', 'intentosFallidos', 'ultimoError', 'fechaPrimerFallo', 'fechaUltimoFallo', 'fechaReg', 'usuarioReg'].join(','),
			...items.map((e) =>
				[
					e.id,
					e.correo,
					e.motivo,
					e.motivoLabel,
					e.estado ? 'Activa' : 'Despejada',
					e.intentosFallidos,
					(e.ultimoError ?? '').replace(/[\r\n,]/g, ' '),
					e.fechaPrimerFallo ?? '',
					e.fechaUltimoFallo ?? '',
					e.fechaReg,
					e.usuarioReg,
				]
					.map((v) => `"${String(v).replace(/"/g, '""')}"`)
					.join(','),
			),
		];
		const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `blacklist-${Date.now()}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
	// #endregion

	// #region SignalR toasts
	private onBlacklistEntryCreated(evt: BlacklistEntryCreatedEvent): void {
		this.messageService.add({
			key: 'blacklist-alerts',
			severity: 'warn',
			summary: 'Bloqueo automático',
			detail: `${evt.correoEnmascarado} agregado a la blacklist (${evt.motivo}).`,
			life: 8000,
		});
		this.dataFacade.refresh();
	}

	private onCandidatoDetectado(evt: CandidatoBlacklistDetectadoEvent): void {
		this.messageService.add({
			key: 'blacklist-alerts',
			severity: 'info',
			summary: 'Candidato a blacklist',
			detail: `${evt.correoEnmascarado} acumula ${evt.hitsActuales}/${evt.thresholdHits} hits.`,
			life: 6000,
		});
	}
	// #endregion
}
