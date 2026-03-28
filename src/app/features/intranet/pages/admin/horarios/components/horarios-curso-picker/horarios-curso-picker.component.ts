// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Tab, TabList, TabPanel, Tabs } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';

import type { CursoOption, CursosPorNivel } from '../../models/curso.interface';

// #endregion
// #region Implementation
@Component({
	selector: 'app-horarios-curso-picker',
	standalone: true,
	imports: [
		CommonModule,
		BadgeModule,
		ButtonModule,
		DialogModule,
		ProgressSpinnerModule,
		Tabs,
		TabList,
		Tab,
		TabPanel,
		TooltipModule,
	],
	templateUrl: './horarios-curso-picker.component.html',
	styleUrl: './horarios-curso-picker.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorariosCursoPickerComponent {
	// #region Inputs
	readonly visible = input.required<boolean>();
	readonly cursosPorNivel = input.required<CursosPorNivel>();
	readonly loading = input<boolean>(false);
	readonly selectedCursoId = input<number | null>(null);
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly cursoSelected = output<number>();
	// #endregion

	// #region Event handlers
	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.visibleChange.emit(false);
		}
	}

	onSelectCurso(cursoId: number): void {
		this.cursoSelected.emit(cursoId);
	}

	onCancel(): void {
		this.visibleChange.emit(false);
	}

	onConfirm(): void {
		this.visibleChange.emit(false);
	}

	trackByCursoId(_index: number, curso: CursoOption): number {
		return curso.value;
	}
	// #endregion
}
// #endregion
