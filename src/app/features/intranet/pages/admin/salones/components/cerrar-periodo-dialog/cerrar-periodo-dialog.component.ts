import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';

import { PeriodoAcademicoListDto, SalonesAdminEstadisticas, NivelEducativo } from '../../models';

@Component({
	selector: 'app-cerrar-periodo-dialog',
	standalone: true,
	imports: [CommonModule, DialogModule, ButtonModule, MessageModule, TagModule],
	templateUrl: './cerrar-periodo-dialog.component.html',
	styleUrl: './cerrar-periodo-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CerrarPeriodoDialogComponent {
	// #region Inputs / Outputs
	readonly visible = input(false);
	readonly periodo = input<PeriodoAcademicoListDto | null>(null);
	readonly nivel = input.required<NivelEducativo>();
	readonly estadisticas = input.required<SalonesAdminEstadisticas>();
	readonly loading = input(false);

	readonly visibleChange = output<boolean>();
	readonly confirmar = output<number>();
	// #endregion

	// #region Event handlers
	onVisibleChange(visible: boolean): void {
		this.visibleChange.emit(visible);
	}

	onConfirmar(): void {
		const periodo = this.periodo();
		if (periodo) {
			this.confirmar.emit(periodo.id);
		}
	}
	// #endregion
}
