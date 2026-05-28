import {
	ChangeDetectionStrategy,
	Component,
	computed,
	OnInit,
	inject,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { MiniSparklineComponent, TableSkeletonComponent } from '@intranet-shared/components';
import {
	CrearEmailQuarantineDto,
	EMAIL_QUARANTINE_MOTIVOS,
	EmailQuarantineFiltroEstado,
	EmailQuarantineListaDto,
	QuarantineDurationHours,
	QuarantineMotivo,
} from '@data/models';

import {
	EmailQuarantineCrudFacade,
	EmailQuarantineDataFacade,
	EmailQuarantineUiFacade,
} from '../../services';
import { trendSummary, TrendSummary } from '../../utils/trend-summary';
import { QuarantineTableComponent } from '../quarantine-table/quarantine-table.component';
import { QuarantineAddDialogComponent } from '../quarantine-add-dialog/quarantine-add-dialog.component';
import { QuarantineDetailDrawerComponent } from '../quarantine-detail-drawer/quarantine-detail-drawer.component';
import { DomainBlockedAlertBannerComponent } from '../domain-blocked-alert-banner/domain-blocked-alert-banner.component';

interface SelectOption<T> {
	label: string;
	value: T;
}

const ESTADO_OPTIONS: SelectOption<EmailQuarantineFiltroEstado>[] = [
	{ label: 'Activas', value: 'activa' },
	{ label: 'Liberadas', value: 'liberada' },
	{ label: 'Todas', value: 'todas' },
];

const MOTIVO_LABELS: Record<QuarantineMotivo, string> = {
	MAILBOX_FULL: 'Buzón lleno (4.2.2)',
	SOFT_BOUNCE_REPEATED: 'Soft-bounce repetido',
	DELAY_72H: 'Retraso > 72h',
	MANUAL: 'Cuarentena manual',
};
const MOTIVO_OPTIONS: SelectOption<QuarantineMotivo>[] = EMAIL_QUARANTINE_MOTIVOS.map(
	(m) => ({ label: MOTIVO_LABELS[m], value: m }),
);

@Component({
	selector: 'app-quarantine-tab',
	standalone: true,
	imports: [
		DecimalPipe,
		FormsModule,
		ButtonModule,
		InputTextModule,
		SelectModule,
		TooltipModule,
		ConfirmDialogModule,
		TableSkeletonComponent,
		MiniSparklineComponent,
		QuarantineTableComponent,
		QuarantineAddDialogComponent,
		QuarantineDetailDrawerComponent,
		DomainBlockedAlertBannerComponent,
	],
	providers: [ConfirmationService],
	templateUrl: './quarantine-tab.component.html',
	styleUrl: './quarantine-tab.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuarantineTabComponent implements OnInit {
	private readonly dataFacade = inject(EmailQuarantineDataFacade);
	private readonly crudFacade = inject(EmailQuarantineCrudFacade);
	private readonly uiFacade = inject(EmailQuarantineUiFacade);
	private readonly confirmationService = inject(ConfirmationService);

	readonly vm = this.dataFacade.vm;
	readonly skeletonColumns = QuarantineTableComponent.skeletonColumns;
	readonly estadoOptions = ESTADO_OPTIONS;
	readonly motivoOptions = MOTIVO_OPTIONS;

	readonly trendSummaryValue = computed<TrendSummary>(() => trendSummary(this.vm().trend));

	ngOnInit(): void {
		this.dataFacade.loadData();
		this.dataFacade.loadTrend();
	}

	onSearchChange(term: string): void {
		this.dataFacade.onSearchChange(term);
	}

	onFilterEstadoChange(value: EmailQuarantineFiltroEstado | null): void {
		this.dataFacade.onFilterEstadoChange(value);
	}

	onFilterMotivoChange(value: QuarantineMotivo | null): void {
		this.dataFacade.onFilterMotivoChange(value);
	}

	onClearFiltros(): void {
		this.dataFacade.clearFiltros();
	}

	onRefresh(): void {
		this.dataFacade.refresh();
	}

	onLazyLoad(event: TableLazyLoadEvent): void {
		const first = event.first ?? 0;
		const rows = event.rows ?? this.vm().pageSize;
		const page = Math.floor(first / rows) + 1;
		if (page === this.vm().page && rows === this.vm().pageSize) return;
		this.dataFacade.loadPage(page, rows);
	}

	onViewDetail(item: EmailQuarantineListaDto): void {
		this.uiFacade.openDetailDrawer(item);
	}

	onRelease(item: EmailQuarantineListaDto): void {
		this.confirmationService.confirm({
			header: 'Liberar cuarentena',
			message: `¿Seguro que querés liberar la cuarentena de "${item.destinatario}"?`,
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

	onDialogDestinatarioChange(value: string): void {
		this.dataFacade.updateFormDestinatario(value);
	}

	onDialogDurationChange(value: QuarantineDurationHours): void {
		this.dataFacade.updateFormDuration(value);
	}

	onDialogObservacionChange(value: string): void {
		this.dataFacade.updateFormObservacion(value);
	}

	onDialogConfirm(request: CrearEmailQuarantineDto): void {
		this.crudFacade.addManual(request);
	}

	onDialogCancel(): void {
		this.uiFacade.closeDialog();
	}

	onDrawerVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeDetailDrawer();
	}

	onDrawerClose(): void {
		this.uiFacade.closeDetailDrawer();
	}

	onDrawerRelease(item: EmailQuarantineListaDto): void {
		this.onRelease(item);
	}
}
