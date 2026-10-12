// #region Imports
import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EduButton, EduDialog, EduInputNumber } from '@edu-ui';
import type { EduInputNumberInputEvent } from '@edu-ui';

// #endregion
// #region Implementation
@Component({
	selector: 'app-curso-builder-dialog',
	standalone: true,
	imports: [FormsModule, EduDialog, EduButton, EduInputNumber],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<edu-dialog
			[visible]="visible()"
			(visibleChange)="onVisibleChange($event)"
			#dlg
			[modal]="true"
			[dirty]="dirty()"
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
					<edu-input-number
						id="numSemanas"
						[ngModel]="numeroSemanas()"
						(ngModelChange)="numeroSemanas.set($event)"
						(onInput)="onSemanasInput($event)"
						[min]="MIN_SEMANAS"
						[max]="MAX_SEMANAS"
						[showButtons]="true"
						buttonLayout="horizontal"
						incrementButtonIcon="pi pi-plus"
						decrementButtonIcon="pi pi-minus"
						inputStyleClass="w-full text-center font-semibold text-lg"
						styleClass="w-full"
					/>
					@if (excedeMaximo()) {
						<small class="text-red-500" role="alert">
							Máximo {{ MAX_SEMANAS }} semanas. Con {{ numeroSemanas() }} no se puede crear: baja el valor a {{ MAX_SEMANAS }} o menos.
						</small>
					} @else {
						<small class="text-color-secondary">Mínimo {{ MIN_SEMANAS }}, máximo {{ MAX_SEMANAS }} semanas</small>
					}
				</div>
			</div>

			<ng-template #footer>
				<div class="flex justify-content-end gap-2 pt-2">
					<edu-button label="Cancelar" [text]="true" data-info-anchor="profesor-curso-builder-cancelar" (click)="dlg.requestClose()" />
					<edu-button
						label="Crear contenido"
						icon="pi pi-check"
						data-info-anchor="profesor-curso-builder-crear"
						(click)="onCreate()"
						[loading]="saving()"
						[disabled]="!semanasValidas()"
					/>
				</div>
			</ng-template>
		</edu-dialog>
	`,
})
export class CursoBuilderDialogComponent {
	readonly visible = input.required<boolean>();
	readonly saving = input<boolean>(false);

	readonly visibleChange = output<boolean>();
	readonly create = output<number>();

	protected readonly MIN_SEMANAS = 1;
	protected readonly MAX_SEMANAS = 52;
	private readonly DEFAULT_SEMANAS = 16;

	/** Valor escrito, sin acotar: el campo solo acota al perder el foco, así que el mensaje debe verlo antes. */
	protected readonly numeroSemanas = signal<number | null>(this.DEFAULT_SEMANAS);

	protected readonly excedeMaximo = computed(() => (this.numeroSemanas() ?? 0) > this.MAX_SEMANAS);
	protected readonly semanasValidas = computed(() => {
		const n = this.numeroSemanas();
		return n !== null && n >= this.MIN_SEMANAS && n <= this.MAX_SEMANAS;
	});
	protected readonly dirty = computed(() => this.numeroSemanas() !== this.DEFAULT_SEMANAS);

	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
		}
	}

	protected onSemanasInput(event: EduInputNumberInputEvent): void {
		this.numeroSemanas.set(typeof event.value === 'number' ? event.value : null);
	}

	onCreate(): void {
		const n = this.numeroSemanas();
		if (this.semanasValidas() && n !== null) {
			this.create.emit(n);
		}
	}
}
// #endregion
