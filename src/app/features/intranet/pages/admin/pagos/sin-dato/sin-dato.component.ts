// #region Imports
import { ChangeDetectionStrategy, Component, inject, OnInit, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

import { getPersonInitials } from '@core/helpers';
import { EduAvatar, EduButton, EduPaginator } from '@edu-ui';
import type { EduPaginatorPageEvent } from '@edu-ui';
import { ErrorStateComponent } from '@shared/components';
import { TableSkeletonComponent } from '@intranet-shared/components';
import type { SkeletonColumnDef } from '@intranet-shared/components';
import { QuienesDebenFiltersComponent } from '../quienes-deben/quienes-deben-filters.component';
import { ConfirmarLoteDialogComponent } from './confirmar-lote-dialog.component';
import { formatFechaConDia, formatSoles } from '../utils/pagos-format.util';
import { SinDatoFacade } from './sin-dato.facade';
// #endregion

/**
 * «Sin dato»: cargos cuya deuda el colegio aún no confirmó, agrupados por alumno (INV-PG14).
 * Nunca muestran saldo ni recargo y no admiten pagos hasta confirmarse. Refleja hoy; no tiene fecha de corte.
 */
@Component({
	selector: 'app-sin-dato',
	standalone: true,
	imports: [ConfirmarLoteDialogComponent, EduAvatar, EduButton, EduPaginator, ErrorStateComponent, QuienesDebenFiltersComponent, RouterLink, TableSkeletonComponent],
	providers: [SinDatoFacade],
	templateUrl: './sin-dato.component.html',
	styleUrl: './sin-dato.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SinDatoComponent implements OnInit {
	protected readonly facade = inject(SinDatoFacade);

	private readonly dialogoLote = viewChild.required(ConfirmarLoteDialogComponent);

	protected readonly soles = formatSoles;
	protected readonly fecha = formatFechaConDia;
	protected readonly iniciales = getPersonInitials;

	protected readonly skeletonColumns: SkeletonColumnDef[] = [
		{ width: 'flex', cellType: 'text' },
		{ width: '140px', cellType: 'text' },
		{ width: '90px', cellType: 'text' },
		{ width: 'flex', cellType: 'text-subtitle' },
		{ width: '130px', cellType: 'text' },
	];

	ngOnInit(): void {
		this.facade.reload();
	}

	protected abrirConfirmarLote(): void {
		this.dialogoLote().open();
	}

	protected onLoteCerrado(huboCambios: boolean): void {
		if (huboCambios) this.facade.reload();
	}

	protected onPage(event: EduPaginatorPageEvent): void {
		this.facade.setPage(Math.floor(event.first / event.rows) + 1, event.rows);
	}
}
