// #region Imports
import { Component, ChangeDetectionStrategy, input, output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CursoContenidoSemanaDto, ActualizarSemanaRequest } from '../../../models';

// #endregion
// #region Implementation
@Component({
	selector: 'app-semana-edit-dialog',
	standalone: true,
	imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, TextareaModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<p-dialog
			[visible]="visible()"
			(visibleChange)="onVisibleChange($event)"
			[modal]="true"
			[header]="semana() ? 'Editar Semana ' + semana()!.numeroSemana : 'Editar Semana'"
			[style]="{ width: '500px', maxWidth: '95vw' }"
		>
			<div class="flex flex-column gap-3 pt-2">
				<div class="flex flex-column gap-2">
					<label for="titulo" class="font-semibold">TÃƒÂ­tulo</label>
					<input
						pInputText
						id="titulo"
						[(ngModel)]="titulo"
						placeholder="Ej: IntroducciÃƒÂ³n al tema"
						[maxlength]="200"
					/>
				</div>

				<div class="flex flex-column gap-2">
					<label for="descripcion" class="font-semibold">DescripciÃƒÂ³n</label>
					<textarea
						pTextarea
						id="descripcion"
						[(ngModel)]="descripcion"
						[rows]="3"
						[maxlength]="2000"
						placeholder="DescripciÃƒÂ³n de los temas de la semana..."
						[autoResize]="true"
					></textarea>
				</div>

				<div class="flex flex-column gap-2">
					<label for="mensaje" class="font-semibold">Mensaje para estudiantes</label>
					<textarea
						pTextarea
						id="mensaje"
						[(ngModel)]="mensajeDocente"
						[rows]="2"
						[maxlength]="2000"
						placeholder="Mensaje o indicaciones para los estudiantes..."
						[autoResize]="true"
					></textarea>
				</div>
			</div>

			<ng-template #footer>
				<div class="flex justify-content-end gap-2">
					<button pButton label="Cancelar" class="p-button-text" (click)="onCancel()"></button>
					<button
						pButton
						label="Guardar"
						icon="pi pi-check"
						(click)="onSave()"
						[loading]="saving()"
					></button>
				</div>
			</ng-template>
		</p-dialog>
	`,
})
export class SemanaEditDialogComponent implements OnChanges {
	readonly visible = input.required<boolean>();
	readonly semana = input.required<CursoContenidoSemanaDto | null>();
	readonly saving = input<boolean>(false);

	readonly visibleChange = output<boolean>();
	readonly save = output<ActualizarSemanaRequest>();

	titulo = '';
	descripcion = '';
	mensajeDocente = '';

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['semana'] || changes['visible']) {
			const s = this.semana();
			if (s && this.visible()) {
				this.titulo = s.titulo ?? '';
				this.descripcion = s.descripcion ?? '';
				this.mensajeDocente = s.mensajeDocente ?? '';
			}
		}
	}

	onVisibleChange(value: boolean): void {
		if (!value) {
			this.visibleChange.emit(false);
		}
	}

	onCancel(): void {
		this.visibleChange.emit(false);
	}

	onSave(): void {
		this.save.emit({
			titulo: this.titulo || null,
			descripcion: this.descripcion || null,
			mensajeDocente: this.mensajeDocente || null,
		});
	}
}
// #endregion
