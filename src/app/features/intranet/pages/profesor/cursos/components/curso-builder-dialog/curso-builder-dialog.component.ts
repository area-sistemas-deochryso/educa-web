import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
	selector: 'app-curso-builder-dialog',
	standalone: true,
	imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputNumberModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<p-dialog
			[visible]="visible()"
			(visibleChange)="onVisibleChange($event)"
			[modal]="true"
			header="Crear Contenido del Curso"
			[style]="{ width: '420px', maxWidth: '95vw' }"
		>
			<div class="flex flex-column gap-3 pt-2">
				<p class="text-color-secondary m-0">
					Define cuántas semanas tendrá el contenido de este curso. Podrás agregar archivos y
					tareas a cada semana después.
				</p>

				<div class="flex flex-column gap-2">
					<label for="numSemanas" class="font-semibold">Número de semanas</label>
					<p-inputNumber
						id="numSemanas"
						[(ngModel)]="numeroSemanas"
						[min]="1"
						[max]="52"
						[showButtons]="true"
						buttonLayout="horizontal"
						incrementButtonIcon="pi pi-plus"
						decrementButtonIcon="pi pi-minus"
						inputStyleClass="w-full text-center"
						styleClass="w-full"
					/>
				</div>
			</div>

			<ng-template #footer>
				<div class="flex justify-content-end gap-2">
					<button pButton label="Cancelar" class="p-button-text" (click)="onCancel()"></button>
					<button
						pButton
						label="Crear"
						icon="pi pi-check"
						(click)="onCreate()"
						[loading]="saving()"
						[disabled]="!numeroSemanas"
					></button>
				</div>
			</ng-template>
		</p-dialog>
	`,
})
export class CursoBuilderDialogComponent {
	readonly visible = input.required<boolean>();
	readonly saving = input<boolean>(false);

	readonly visibleChange = output<boolean>();
	readonly create = output<number>();

	numeroSemanas = 16;

	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
		}
	}

	onCancel(): void {
		this.visibleChange.emit(false);
	}

	onCreate(): void {
		if (this.numeroSemanas > 0) {
			this.create.emit(this.numeroSemanas);
		}
	}
}
