import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { EmailOutboxLista } from '@data/models/email-outbox.models';
import type { SkeletonColumnDef } from '@shared/components';

import { esPermanente } from '../../models/tipo-fallo.models';
import { TipoFalloLabelPipe } from '../../pipes/tipo-fallo-label.pipe';
import { TipoFalloSeverityPipe } from '../../pipes/tipo-fallo-severity.pipe';

@Component({
	selector: 'app-email-outbox-table',
	standalone: true,
	imports: [
		TableModule,
		TagModule,
		ButtonModule,
		TooltipModule,
		DatePipe,
		TipoFalloLabelPipe,
		TipoFalloSeverityPipe,
	],
	templateUrl: './email-outbox-table.component.html',
	styleUrl: './email-outbox-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxTableComponent {
	// #region Inputs/Outputs
	readonly items = input.required<EmailOutboxLista[]>();
	readonly loading = input(false);
	readonly viewDetail = output<EmailOutboxLista>();
	readonly retry = output<EmailOutboxLista>();
	// #endregion

	// #region Skeleton config
	static readonly skeletonColumns: SkeletonColumnDef[] = [
		{ width: '50px', cellType: 'text' },
		{ width: '120px', cellType: 'badge' },
		{ width: 'flex', cellType: 'text-subtitle' },
		{ width: '100px', cellType: 'badge' },
		{ width: '140px', cellType: 'badge' },
		{ width: '80px', cellType: 'text' },
		{ width: '130px', cellType: 'text' },
		{ width: '100px', cellType: 'actions' },
	];
	// #endregion

	// #region Helpers
	getEstadoSeverity(estado: string): 'success' | 'danger' | 'warn' | 'info' {
		switch (estado) {
			case 'SENT':
				return 'success';
			case 'FAILED':
				return 'danger';
			case 'PENDING':
				return 'warn';
			case 'PROCESSING':
				return 'info';
			default:
				return 'info';
		}
	}

	getEstadoLabel(estado: string): string {
		switch (estado) {
			case 'SENT':
				return 'Enviado';
			case 'FAILED':
				return 'Fallido';
			case 'PENDING':
				return 'Pendiente';
			case 'PROCESSING':
				return 'Procesando';
			default:
				return estado;
		}
	}

	esPermanente(tipoFallo: string | null): boolean {
		return esPermanente(tipoFallo);
	}
	// #endregion
}
