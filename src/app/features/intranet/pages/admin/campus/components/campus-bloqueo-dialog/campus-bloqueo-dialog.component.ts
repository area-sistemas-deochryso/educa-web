import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';

import { BloqueoFormData } from '../../models';

@Component({
	selector: 'app-campus-bloqueo-dialog',
	standalone: true,
	imports: [FormsModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule],
	templateUrl: './campus-bloqueo-dialog.component.html',
	styleUrl: './campus-bloqueo-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusBloqueoDialogComponent {
	// #region Inputs / Outputs

	readonly visible = input(false);
	readonly formData = input.required<BloqueoFormData>();
	readonly saving = input(false);

	readonly visibleChange = output<boolean>();
	readonly save = output<void>();
	readonly formDataChange = output<Partial<BloqueoFormData>>();

	// #endregion

	// #region Event handlers

	onVisibleChange(value: boolean): void {
		this.visibleChange.emit(value);
	}

	onMotivoChange(value: string): void {
		this.formDataChange.emit({ motivo: value });
	}

	onWidthChange(value: number): void {
		this.formDataChange.emit({ width: value });
	}

	onHeightChange(value: number): void {
		this.formDataChange.emit({ height: value });
	}

	onSave(): void {
		this.save.emit();
	}

	onCancel(): void {
		this.visibleChange.emit(false);
	}

	// #endregion
}
