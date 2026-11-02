// #region Imports
import { ChangeDetectionStrategy, Component, effect, inject, input, untracked } from '@angular/core';

import { ErrorStateComponent } from '@shared/components';
import { TableSkeletonComponent } from '@intranet-shared/components';
import type { SkeletonColumnDef } from '@intranet-shared/components';
import { EduButton } from '@edu-ui';
import { formatSoles } from '../utils/pagos-format.util';
import { QuienesDebenFacade } from './quienes-deben.facade';
import { QuienesDebenFiltersComponent } from './quienes-deben-filters.component';
import { QuienesDebenTableComponent } from './quienes-deben-table.component';
// #endregion

/**
 * «¿Quiénes deben?»: lista paginada (servidor) de alumnos con deuda vencida a la fecha de la foto del panel.
 * Los totales son del conjunto filtrado completo, no de la página visible.
 */
@Component({
	selector: 'app-quienes-deben',
	standalone: true,
	imports: [
		EduButton,
		ErrorStateComponent,
		TableSkeletonComponent,
		QuienesDebenFiltersComponent,
		QuienesDebenTableComponent,
	],
	providers: [QuienesDebenFacade],
	templateUrl: './quienes-deben.component.html',
	styleUrl: './quienes-deben.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuienesDebenComponent {
	/** Fecha de la foto del panel (`YYYY-MM-DD`); `null` = hoy. */
	readonly fecha = input<string | null>(null);

	protected readonly facade = inject(QuienesDebenFacade);
	protected readonly soles = formatSoles;

	protected readonly skeletonColumns: SkeletonColumnDef[] = [
		{ width: '40px', cellType: 'text' },
		{ width: 'flex', cellType: 'text' },
		{ width: '120px', cellType: 'text' },
		{ width: '110px', cellType: 'badge' },
		{ width: '90px', cellType: 'text' },
		{ width: '90px', cellType: 'text' },
		{ width: '110px', cellType: 'text' },
		{ width: '130px', cellType: 'text-subtitle' },
	];

	constructor() {
		effect(() => {
			const fecha = this.fecha();
			untracked(() => this.facade.setFecha(fecha));
		});
	}
}
