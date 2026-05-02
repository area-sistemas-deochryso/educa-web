import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import { TableSkeletonComponent } from '@shared/components';
import {
	CrearEmailDomainPauseDto,
	DomainPauseDurationHours,
	DomainPauseMotivo,
	EMAIL_DOMAIN_PAUSE_MOTIVOS,
	EmailDomainPauseListaDto,
} from '@data/models/email-domain-pause.models';

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

@Component({
	selector: 'app-domain-pauses-tab',
	standalone: true,
	imports: [
		FormsModule,
		ButtonModule,
		InputTextModule,
		SelectModule,
		ToggleSwitchModule,
		TooltipModule,
		ConfirmDialogModule,
		TableSkeletonComponent,
		DomainPausesTableComponent,
		DomainPausesAddDialogComponent,
		DomainBlockedAlertBannerComponent,
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

	readonly vm = this.dataFacade.vm;
	readonly skeletonColumns = DomainPausesTableComponent.skeletonColumns;
	readonly motivoOptions = MOTIVO_OPTIONS;

	ngOnInit(): void {
		this.dataFacade.loadData();
	}

	onSearchChange(term: string): void {
		this.dataFacade.onSearchChange(term);
	}

	onFilterMotivoChange(value: DomainPauseMotivo | null): void {
		this.dataFacade.onFilterMotivoChange(value);
	}

	onShowLiberadasChange(show: boolean): void {
		this.dataFacade.onShowLiberadasChange(show);
	}

	onClearFiltros(): void {
		this.dataFacade.clearFiltros();
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
}
