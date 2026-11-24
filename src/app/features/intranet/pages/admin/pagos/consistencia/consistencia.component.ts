// #region Imports
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { getPersonInitials } from '@core/helpers';
import { EduAvatar, EduPaginator, EduSelectButton } from '@edu-ui';
import type { EduPaginatorPageEvent } from '@edu-ui';
import { ErrorStateComponent } from '@shared/components';
import { TableSkeletonComponent } from '@intranet-shared/components';
import type { SkeletonColumnDef } from '@intranet-shared/components';
import { QuienesDebenFiltersComponent } from '../quienes-deben/quienes-deben-filters.component';
import { formatSoles } from '../utils/pagos-format.util';
import { ConsistenciaFacade } from './consistencia.facade';
import type { ConsistenciaVista } from './consistencia.facade';
// #endregion

const VISTAS: { value: ConsistenciaVista; label: string }[] = [
	{ value: 'sin-cargo', label: 'Matriculados sin cargo' },
	{ value: 'sin-matricula', label: 'Cargos sin matrícula' },
];

/**
 * Consistencia matrícula ↔ cobro (P123 F5): quién está matriculado y no tiene ningún cargo del año, y de quién hay
 * cargos sin matrícula activa. Solo informa: no bloquea matrícula ni cobro. Acción por fila: abrir el estado de cuenta.
 * Generar el cargo de un alumno suelto no existe en el BE (solo por salón o año): queda para P123 F7.
 */
@Component({
	selector: 'app-consistencia',
	standalone: true,
	imports: [
		FormsModule,
		EduAvatar,
		EduPaginator,
		EduSelectButton,
		ErrorStateComponent,
		QuienesDebenFiltersComponent,
		RouterLink,
		TableSkeletonComponent,
	],
	providers: [ConsistenciaFacade],
	templateUrl: './consistencia.component.html',
	styleUrl: './consistencia.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsistenciaComponent implements OnInit {
	protected readonly facade = inject(ConsistenciaFacade);

	protected readonly vistas = VISTAS;
	protected readonly soles = formatSoles;
	protected readonly iniciales = getPersonInitials;

	protected readonly skeletonColumns: SkeletonColumnDef[] = [
		{ width: 'flex', cellType: 'text' },
		{ width: '160px', cellType: 'text' },
		{ width: '220px', cellType: 'text' },
	];

	ngOnInit(): void {
		this.facade.reload();
	}

	protected onVista(vista: ConsistenciaVista): void {
		this.facade.setVista(vista);
	}

	protected onPage(event: EduPaginatorPageEvent): void {
		this.facade.setPage(Math.floor(event.first / event.rows) + 1, event.rows);
	}
}
