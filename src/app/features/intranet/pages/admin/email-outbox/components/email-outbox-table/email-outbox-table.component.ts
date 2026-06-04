import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import {
	EMAIL_OUTBOX_TIPO_LABELS,
	EmailOutboxLista,
	EmailOutboxTipo,
} from '@data/models';
import type { SkeletonColumnDef } from '@intranet-shared/components';
import { CorrelationIdPillComponent } from '@intranet-shared/components';

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
		RouterLink,
		TipoFalloLabelPipe,
		TipoFalloSeverityPipe,
		CorrelationIdPillComponent,
	],
	templateUrl: './email-outbox-table.component.html',
	styleUrl: './email-outbox-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailOutboxTableComponent {
	// #region Inputs/Outputs
	readonly items = input.required<EmailOutboxLista[]>();
	readonly loading = input(false);
	// Plan 43 Chat 4.1b — paginación server-side variante B
	readonly page = input(1);
	readonly pageSize = input(25);
	readonly totalRecords = input(0);
	readonly viewDetail = output<EmailOutboxLista>();
	readonly retry = output<EmailOutboxLista>();
	readonly exportCaso = output<EmailOutboxLista>();
	readonly lazyLoad = output<{ page: number; pageSize: number }>();
	// #endregion

	// #region Computed
	/** Offset que PrimeNG espera en `[first]` (0-based). */
	get firstRecord(): number {
		return (this.page() - 1) * this.pageSize();
	}
	// #endregion

	// #region Handlers
	onLazyLoad(event: TableLazyLoadEvent): void {
		const first = event.first ?? 0;
		const rows = event.rows ?? this.pageSize();
		const nextPage = Math.floor(first / rows) + 1;
		this.lazyLoad.emit({ page: nextPage, pageSize: rows });
	}
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
		{ width: '110px', cellType: 'badge' },
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

	/** Label corto del tipo (Plan 28 Chat 4c — distingue corrección AA/profesor/estudiante). */
	getTipoLabel(tipo: string): string {
		return EMAIL_OUTBOX_TIPO_LABELS[tipo as EmailOutboxTipo] ?? tipo;
	}
	// #endregion
}
