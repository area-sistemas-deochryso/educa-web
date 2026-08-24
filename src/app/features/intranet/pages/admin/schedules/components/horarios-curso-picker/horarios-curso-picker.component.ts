// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';

import type { CursoOption, CursosPorNivel } from '../../models/curso.interface';
import { EduBadge, EduDialog, EduSpinner, EduTab, EduTabPanel, EduTabs, EduTemplate, EduTooltip } from '@edu-ui';

// #endregion
// #region Implementation
@Component({
	selector: 'app-schedules-course-picker',
	standalone: true,
	imports: [CommonModule, EduBadge, ButtonModule, EduDialog, EduSpinner, EduTabs, EduTab, EduTabPanel, EduTooltip, EduTemplate],
	templateUrl: './horarios-curso-picker.component.html',
	styleUrl: './horarios-curso-picker.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesCoursePickerComponent {
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
