// #region Imports
import { Component, ChangeDetectionStrategy, input, output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { CursoContenidoTareaDto, CrearTareaRequest, ActualizarTareaRequest } from '../../../models';

// #endregion
// #region Implementation
@Component({
	selector: 'app-tarea-dialog',
	standalone: true,
	imports: [CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, TextareaModule, DatePickerModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<p-dialog
			[visible]="visible()"
			(visibleChange)="onVisibleChange($event)"
			[modal]="true"
			[header]="tarea() ? 'Editar Tarea' : 'Nueva Tarea'"
			[style]="{ width: '520px', maxWidth: '95vw' }"
		>
			<div class="edit-form">
				<div class="form-field">
					<label for="tareaTitle" class="form-label">
						<i class="pi pi-file-edit" style="font-size: 0.78rem"></i>
						Título *
					</label>
					<input
						pInputText
						id="tareaTitle"
						[(ngModel)]="titulo"
						placeholder="Título de la tarea"
						[maxlength]="200"
						class="w-full"
					/>
				</div>

				<div class="form-field">
					<label for="tareaDesc" class="form-label">
						<i class="pi pi-align-left" style="font-size: 0.78rem"></i>
						Descripción
					</label>
					<textarea
						pTextarea
						id="tareaDesc"
						[(ngModel)]="descripcion"
						[rows]="3"
						[maxlength]="2000"
						placeholder="Descripción e instrucciones de la tarea..."
						[autoResize]="true"
						class="w-full"
					></textarea>
				</div>

				<div class="form-field">
					<label for="tareaFecha" class="form-label">
						<i class="pi pi-calendar" style="font-size: 0.78rem"></i>
						Fecha límite
					</label>
					<p-datepicker
						id="tareaFecha"
						[(ngModel)]="fechaLimite"
						[showIcon]="true"
						[showButtonBar]="true"
						dateFormat="dd/mm/yy"
						placeholder="Seleccionar fecha"
						appendTo="body"
						styleClass="w-full"
					/>
				</div>
			</div>

			<ng-template #footer>
				<div class="dialog-footer">
					<button pButton label="Cancelar" class="p-button-text" (click)="onCancel()"></button>
					<button
						pButton
						[label]="tarea() ? 'Guardar' : 'Crear'"
						icon="pi pi-check"
						(click)="onSave()"
						[loading]="saving()"
						[disabled]="!titulo.trim()"
					></button>
				</div>
			</ng-template>
		</p-dialog>
	`,
	styles: `
		.edit-form {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
			padding: 0.5rem 1rem;
		}
		.form-field {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}
		.form-label {
			font-size: 0.82rem;
			font-weight: 600;
			color: var(--text-color);
			display: flex;
			align-items: center;
			gap: 0.4rem;
			i {
				color: var(--text-color-secondary);
			}
		}
		.dialog-footer {
			display: flex;
			justify-content: flex-end;
			gap: 0.5rem;
		}
	`,
})
export class TareaDialogComponent implements OnChanges {
	readonly visible = input.required<boolean>();
	readonly tarea = input.required<CursoContenidoTareaDto | null>();
	readonly saving = input<boolean>(false);

	readonly visibleChange = output<boolean>();
	readonly createTarea = output<CrearTareaRequest>();
	readonly updateTarea = output<ActualizarTareaRequest>();

	titulo = '';
	descripcion = '';
	fechaLimite: Date | null = null;

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['tarea'] || changes['visible']) {
			const t = this.tarea();
			if (this.visible()) {
				if (t) {
					this.titulo = t.titulo;
					this.descripcion = t.descripcion ?? '';
					this.fechaLimite = t.fechaLimite ? new Date(t.fechaLimite) : null;
				} else {
					this.titulo = '';
					this.descripcion = '';
					this.fechaLimite = null;
				}
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
		if (!this.titulo.trim()) return;

		const fechaStr = this.fechaLimite ? this.fechaLimite.toISOString() : null;

		if (this.tarea()) {
			this.updateTarea.emit({
				titulo: this.titulo.trim(),
				descripcion: this.descripcion.trim() || null,
				fechaLimite: fechaStr,
			});
		} else {
			this.createTarea.emit({
				titulo: this.titulo.trim(),
				descripcion: this.descripcion.trim() || null,
				fechaLimite: fechaStr,
			});
		}
	}
}
// #endregion
