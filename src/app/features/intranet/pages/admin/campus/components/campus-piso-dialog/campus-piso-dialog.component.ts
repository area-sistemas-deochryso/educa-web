import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';

import { PisoFormData } from '../../models';

@Component({
	selector: 'app-campus-piso-dialog',
	standalone: true,
	imports: [FormsModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule],
	templateUrl: './campus-piso-dialog.component.html',
	styleUrl: './campus-piso-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusPisoDialogComponent {
	// #region Inputs / Outputs

	readonly visible = input(false);
	readonly isEditing = input(false);
	readonly formData = input.required<PisoFormData>();
	readonly saving = input(false);

	readonly visibleChange = output<boolean>();
	readonly save = output<void>();
	readonly formDataChange = output<Partial<PisoFormData>>();

	// #endregion

	// #region Event handlers

	onVisibleChange(value: boolean): void {
		this.visibleChange.emit(value);
	}

	onNombreChange(value: string): void {
		this.formDataChange.emit({ nombre: value });
	}

	onOrdenChange(value: number): void {
		this.formDataChange.emit({ orden: value });
	}

	onAlturaChange(value: number): void {
		this.formDataChange.emit({ alturaMetros: value });
	}

	onSave(): void {
		this.save.emit();
	}

	onCancel(): void {
		this.visibleChange.emit(false);
	}

	// #endregion
}
