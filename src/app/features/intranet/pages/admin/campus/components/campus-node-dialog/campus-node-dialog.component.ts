import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EditorNodeType, NodeFormData } from '../../models';
import { EduButton, EduDialog, EduInputNumber, EduInputText, EduSelect } from '@edu-ui';

@Component({
	selector: 'app-campus-node-dialog',
	standalone: true,
	imports: [FormsModule, EduButton, EduDialog, EduInputText, EduInputNumber, EduSelect],
	templateUrl: './campus-node-dialog.component.html',
	styleUrl: './campus-node-dialog.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusNodeDialogComponent {
	// #region Inputs / Outputs

	readonly visible = input(false);
	readonly formData = input.required<NodeFormData>();
	readonly nodeTypeOptions = input.required<{ label: string; value: EditorNodeType }[]>();
	readonly saving = input(false);

	readonly visibleChange = output<boolean>();
	readonly save = output<void>();
	readonly formDataChange = output<Partial<NodeFormData>>();

	// #endregion

	// #region Event handlers

	onVisibleChange(value: boolean): void {
		this.visibleChange.emit(value);
	}

	onEtiquetaChange(value: string): void {
		this.formDataChange.emit({ etiqueta: value });
	}

	onTipoChange(value: EditorNodeType): void {
		this.formDataChange.emit({ tipo: value });
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
