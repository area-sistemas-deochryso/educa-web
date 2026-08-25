import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PeriodoAcademicoListDto, SalonesAdminEstadisticas, NivelEducativo } from '../../models';
import { EduButton, EduDialog, EduMessage, EduTag } from '@edu-ui';

@Component({
	selector: 'app-close-period-dialog',
	standalone: true,
	imports: [CommonModule, EduDialog, EduButton, EduMessage, EduTag],
	templateUrl: './cerrar-periodo-dialog.component.html',
	styleUrl: './cerrar-periodo-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClosePeriodDialogComponent {
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
