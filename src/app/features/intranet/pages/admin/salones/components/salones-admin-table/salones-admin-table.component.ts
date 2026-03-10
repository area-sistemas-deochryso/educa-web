import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { SalonAdminListDto } from '../../models';

@Component({
	selector: 'app-salones-admin-table',
	standalone: true,
	imports: [CommonModule, TableModule, ButtonModule, TagModule, TooltipModule],
	templateUrl: './salones-admin-table.component.html',
	styleUrl: './salones-admin-table.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalonesAdminTableComponent {
	// #region Inputs / Outputs
	readonly salones = input.required<SalonAdminListDto[]>();
	readonly loading = input(false);

	readonly selectSalon = output<number>();
	// #endregion

	// #region Helpers
	getEstadoPeriodoSeverity(estado: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast' {
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

	getEstadoPeriodoLabel(estado: string): string {
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
	// #endregion
}
