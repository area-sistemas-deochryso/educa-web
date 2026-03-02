// #region Imports
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';

// #endregion
// #region Implementation
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
			[style]="{ width: '460px', maxWidth: '95vw' }"
		>
			<div class="flex flex-column gap-4 py-2">
				<!-- Intro -->
				<div class="flex align-items-start gap-3">
					<div
						class="flex align-items-center justify-content-center border-circle flex-shrink-0"
						style="width: 2.75rem; height: 2.75rem; background: var(--primary-100); color: var(--primary-600)"
					>
						<i class="pi pi-book text-xl"></i>
					</div>
					<p class="text-color-secondary m-0 line-height-3">
						Define cuántas semanas tendrá el contenido de este curso. Podrás agregar archivos y
						tareas a cada semana después.
					</p>
				</div>

				<!-- Input -->
				<div class="flex flex-column gap-2 px-2">
					<label for="numSemanas" class="font-semibold text-sm">Número de semanas</label>
					<p-inputNumber
						id="numSemanas"
						[(ngModel)]="numeroSemanas"
						[min]="1"
						[max]="52"
						[showButtons]="true"
						buttonLayout="horizontal"
						incrementButtonIcon="pi pi-plus"
						decrementButtonIcon="pi pi-minus"
						inputStyleClass="w-full text-center font-semibold text-lg"
						styleClass="w-full"
					/>
					<small class="text-color-secondary">Mínimo 1, máximo 52 semanas</small>
				</div>
			</div>

			<ng-template #footer>
				<div class="flex justify-content-end gap-2 pt-2">
					<button pButton label="Cancelar" class="p-button-text" (click)="onCancel()"></button>
					<button
						pButton
						label="Crear contenido"
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
// #endregion
