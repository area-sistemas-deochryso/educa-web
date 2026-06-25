import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
	signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { TableSkeletonComponent } from '@intranet-shared/components';
import {
	CrearEmailDomainPauseDto,
	DomainPauseDurationHours,
	DomainPauseMotivo,
	EMAIL_DOMAIN_PAUSE_MOTIVOS,
	EmailDomainPauseFiltroEstado,
	EmailDomainPauseListaDto,
} from '@data/models';

import { ActivatedRoute } from '@angular/router';

import { HubContextBannerComponent, readHubContext } from '../../../monitoreo/shared';
import {
	EmailDomainPauseCrudFacade,
	EmailDomainPauseDataFacade,
	EmailDomainPauseUiFacade,
} from '../../services';
import { DomainPausesTableComponent } from '../domain-pauses-table/domain-pauses-table.component';
import { DomainPausesAddDialogComponent } from '../domain-pauses-add-dialog/domain-pauses-add-dialog.component';
import { DomainBlockedAlertBannerComponent } from '../domain-blocked-alert-banner/domain-blocked-alert-banner.component';

interface SelectOption<T> {
	label: string;
	value: T;
}

const MOTIVO_LABELS: Record<DomainPauseMotivo, string> = {
	DEFER_BURST: 'Burst de defers',
	DOMAIN_BLOCKED_NDR: 'NDR de bloqueo',
	MANUAL: 'Pausa manual',
};

const MOTIVO_OPTIONS: SelectOption<DomainPauseMotivo>[] = EMAIL_DOMAIN_PAUSE_MOTIVOS.map(
	(m) => ({ label: MOTIVO_LABELS[m], value: m }),
);

const ESTADO_OPTIONS: SelectOption<EmailDomainPauseFiltroEstado>[] = [
	{ label: 'Activas', value: 'activa' },
	{ label: 'Liberadas', value: 'liberada' },
];

@Component({
	selector: 'app-domain-pauses-tab',
	standalone: true,
	imports: [
		FormsModule,
		ButtonModule,
		InputTextModule,
		SelectModule,
		TooltipModule,
		ConfirmDialogModule,
		TableSkeletonComponent,
		DomainPausesTableComponent,
		DomainPausesAddDialogComponent,
		DomainBlockedAlertBannerComponent,
		HubContextBannerComponent,
	],
	providers: [ConfirmationService],
	templateUrl: './domain-pauses-tab.component.html',
	styleUrl: './domain-pauses-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DomainPausesTabComponent implements OnInit {
	private readonly dataFacade = inject(EmailDomainPauseDataFacade);
	private readonly crudFacade = inject(EmailDomainPauseCrudFacade);
	private readonly uiFacade = inject(EmailDomainPauseUiFacade);
	private readonly confirmationService = inject(ConfirmationService);
	private readonly route = inject(ActivatedRoute);

	readonly vm = this.dataFacade.vm;
	readonly skeletonColumns = DomainPausesTableComponent.skeletonColumns;
	readonly estadoOptions = ESTADO_OPTIONS;
	readonly motivoOptions = MOTIVO_OPTIONS;
	readonly hubFiltered = signal(false);
	readonly hubFilterMessage = signal('');

	ngOnInit(): void {
		const hubCtx = readHubContext(this.route);
		if (hubCtx.fromHub && hubCtx.level) {
			this.hubFiltered.set(true);
			this.hubFilterMessage.set('Filtrado desde el hub — mostrando pausas activas');
		}

		this.dataFacade.loadData();
	}

	onSearchChange(term: string): void {
		this.dataFacade.onSearchChange(term);
	}

	onFilterMotivoChange(value: DomainPauseMotivo | null): void {
		this.dataFacade.onFilterMotivoChange(value);
	}

	onFilterEstadoChange(value: EmailDomainPauseFiltroEstado | null): void {
		this.dataFacade.onFilterEstadoChange(value);
	}

	onClearFiltros(): void {
		this.dataFacade.clearFiltros();
		this.hubFiltered.set(false);
	}

	clearHubFilter(): void {
		this.onClearFiltros();
	}

	onRefresh(): void {
		this.dataFacade.refresh();
	}

	onRelease(item: EmailDomainPauseListaDto): void {
		this.confirmationService.confirm({
			header: 'Liberar pausa',
			message: `¿Liberar la pausa de "${item.dominio}"? Los envíos se reanudarán inmediatamente.`,
			acceptLabel: 'Liberar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-warning',
			rejectButtonStyleClass: 'p-button-text',
			icon: 'pi pi-exclamation-triangle',
			accept: () => this.crudFacade.release(item),
		});
	}

	onOpenAddDialog(): void {
		this.uiFacade.openAddDialog();
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeDialog();
	}

	onDialogDominioChange(value: string): void {
		this.dataFacade.updateFormDominio(value);
	}

	onDialogDurationChange(value: DomainPauseDurationHours): void {
		this.dataFacade.updateFormDuration(value);
	}

	onDialogObservacionChange(value: string): void {
		this.dataFacade.updateFormObservacion(value);
	}

	onDialogConfirm(request: CrearEmailDomainPauseDto): void {
		this.crudFacade.addManual(request);
	}

	onDialogCancel(): void {
		this.uiFacade.closeDialog();
	}

	onExportCsv(): void {
		const items = this.vm().items;
		if (items.length === 0) return;

		const rows = [
			['id', 'dominio', 'motivo', 'triggerEventCount', 'estado', 'pausedUntil', 'observacion', 'fechaReg', 'usuarioReg'].join(','),
			...items.map((e) =>
				[
					e.id,
					e.dominio,
					e.motivo,
					e.triggerEventCount,
					e.estado ? 'Activa' : 'Liberada',
					e.pausedUntil,
					(e.observacion ?? '').replace(/[\r\n,]/g, ' '),
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
		a.download = `domain-pauses-${Date.now()}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
}
