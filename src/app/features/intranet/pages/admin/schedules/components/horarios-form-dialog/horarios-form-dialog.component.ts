// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import type { HorarioFormData } from '../../models/horario.interface';
import type { SalonOption } from '../../models/salon.interface';

// #endregion
// #region Implementation
@Component({
	selector: 'app-schedules-form-dialog',
	standalone: true,
	imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TooltipModule],
	templateUrl: './horarios-form-dialog.component.html',
	styleUrl: './horarios-form-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulesFormDialogComponent {
	// #region Inputs
	readonly visible = input.required<boolean>();
	readonly isEditing = input.required<boolean>();
	readonly formData = input.required<HorarioFormData>();
	readonly salonesOptions = input.required<SalonOption[]>();
	readonly optionsLoading = input<boolean>(false);
	readonly formValid = input<boolean>(false);
	readonly loading = input<boolean>(false);
	readonly cursoSeleccionadoLabel = input<string>('Seleccionar curso por nivel');
	readonly cursoSeleccionadoNiveles = input<string>('');
	// #endregion

	// #region Outputs
	readonly visibleChange = output<boolean>();
	readonly save = output<void>();
	readonly openCursoDialog = output<void>();
	readonly clearCurso = output<void>();
	// #endregion

	// #region Static options
	readonly diasOptions = [
		{ label: 'Lunes', value: 1 },
		{ label: 'Martes', value: 2 },
		{ label: 'Miercoles', value: 3 },
		{ label: 'Jueves', value: 4 },
		{ label: 'Viernes', value: 5 },
	];
	// #endregion

	// #region Event handlers
	onVisibleChange(visible: boolean): void {
		if (!visible) {
			this.visibleChange.emit(false);
		}
	}

	onSave(): void {
		this.save.emit();
	}

	onOpenCursoDialog(): void {
		this.openCursoDialog.emit();
	}

	onClearCurso(): void {
		this.clearCurso.emit();
	}

	onCancel(): void {
		this.visibleChange.emit(false);
	}
	// #endregion
}
// #endregion
