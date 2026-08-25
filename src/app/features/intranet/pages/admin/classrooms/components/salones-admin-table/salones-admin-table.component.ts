import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { type ModoAsignacion, resolveModoAsignacion } from '@data/models';
import { ModoAsignacionBadgeComponent } from '@shared/components';
import { SalonAdminListDto, PeriodoCierreEstado } from '../../models';
import { EduButton, EduSortableColumn, EduTable, EduTag, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-classrooms-admin-table',
	standalone: true,
	imports: [CommonModule, EduTable, EduButton, EduTag, ModoAsignacionBadgeComponent, EduTooltip, EduSortableColumn],
	templateUrl: './salones-admin-table.component.html',
	styleUrl: './salones-admin-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassroomsAdminTableComponent {
	// #region Inputs / Outputs
	readonly salones = input.required<SalonAdminListDto[]>();
	readonly loading = input(false);

	readonly selectSalon = output<number>();
	readonly goToHorarios = output<number>();
	readonly goToUsuarios = output<number>();
	// #endregion

	// #region Helpers
	getEstadoPeriodoSeverity(estado: PeriodoCierreEstado | string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast' {
		switch (estado) {
			case 'CERRADO':
				return 'success';
			case 'ABIERTO':
				return 'info';
			case 'SIN_PERIODO':
				return 'warn';
			default:
				return 'secondary';
		}
	}

	getEstadoPeriodoLabel(estado: PeriodoCierreEstado | string): string {
		switch (estado) {
			case 'CERRADO':
				return 'Cerrado';
			case 'ABIERTO':
				return 'Abierto';
			case 'SIN_PERIODO':
				return 'Sin periodo';
			default:
				return estado;
		}
	}

	getModoAsignacion(salon: SalonAdminListDto): ModoAsignacion {
		return resolveModoAsignacion(salon.gradoOrden, salon.seccion);
	}
	// #endregion
}
