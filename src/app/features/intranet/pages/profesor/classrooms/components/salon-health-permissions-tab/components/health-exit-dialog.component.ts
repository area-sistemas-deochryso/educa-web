import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';

import { StudentForHealthDto, SymptomDto } from '@features/intranet/pages/profesor/models';

@Component({
	selector: 'app-health-exit-dialog',
	standalone: true,
	imports: [CommonModule, FormsModule, DialogModule, SelectModule, MultiSelectModule, TextareaModule, ButtonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<p-dialog
			header="Permiso de Salida por Salud"
			[visible]="visible()"
			(visibleChange)="onVisibleChange($event)"
			[modal]="true"
			[style]="{ width: '500px', maxWidth: '95vw' }"
		>
			<div class="form-grid">
				<!-- Estudiante -->
				<label for="exit-student">Estudiante</label>
				<p-select
					id="exit-student"
					[options]="studentOptions()"
					[(ngModel)]="selectedStudent"
					optionLabel="label"
					optionValue="value"
					placeholder="Seleccionar estudiante"
					[filter]="true"
					filterPlaceholder="Buscar..."
					appendTo="body"
					styleClass="w-full"
				/>

				<!-- Sintomas -->
				<label for="exit-symptoms">Síntomas</label>
				<p-multiselect
					id="exit-symptoms"
					[options]="symptomOptions()"
					[(ngModel)]="selectedSymptoms"
					optionLabel="label"
					optionValue="value"
					placeholder="Seleccionar síntomas"
					appendTo="body"
					styleClass="w-full"
					[showClear]="true"
				/>

				<!-- Detalle (si "OTRO" seleccionado) -->
				@if (showDetail()) {
					<label for="exit-detail">Detalle del síntoma</label>
					<textarea
						pInputTextarea
						id="exit-detail"
						[(ngModel)]="detail"
						placeholder="Describa el síntoma..."
						[rows]="2"
						[maxlength]="500"
						class="w-full"
					></textarea>
				}

				<!-- Observacion -->
				<label for="exit-obs">Observación (opcional)</label>
				<textarea
					pInputTextarea
					id="exit-obs"
					[(ngModel)]="observacion"
					placeholder="Observación adicional..."
					[rows]="2"
					[maxlength]="500"
					class="w-full"
				></textarea>
			</div>

			<ng-template #footer>
				<button
					pButton
					label="Cancelar"
					class="p-button-text"
					(click)="onVisibleChange(false)"
				></button>
				<button
					pButton
					label="Emitir Permiso"
					icon="pi pi-check"
					[disabled]="!canSave() || saving()"
					[loading]="saving()"
					(click)="onSave()"
				></button>
			</ng-template>
		</p-dialog>
	`,
	styles: [
		`
			.form-grid {
				display: flex;
				flex-direction: column;
				gap: 0.75rem;
			}

			label {
				font-weight: 600;
				font-size: 0.875rem;
				color: var(--text-color);
			}
		`,
	],
})
export class HealthExitDialogComponent {
	// #region Inputs/Outputs
	readonly visible = input(false);
	readonly estudiantes = input<StudentForHealthDto[]>([]);
	readonly sintomas = input<SymptomDto[]>([]);
	readonly saving = input(false);
	readonly salonId = input.required<number>();
	readonly visibleChange = output<boolean>();
	readonly save = output<{ estudianteId: number; sintomas: string[]; sintomaDetalle?: string; observacion?: string }>();
	// #endregion

	// #region Estado local
	selectedStudent: number | null = null;
	selectedSymptoms: string[] = [];
	detail = '';
	observacion = '';

	readonly studentOptions = signal<{ label: string; value: number }[]>([]);
	readonly symptomOptions = signal<{ label: string; value: string }[]>([]);
	// #endregion

	// #region Computed helpers
	showDetail(): boolean {
		return this.selectedSymptoms.includes('OTRO');
	}

	canSave(): boolean {
		if (!this.selectedStudent || this.selectedSymptoms.length === 0) return false;
		if (this.showDetail() && !this.detail.trim()) return false;
		return true;
	}
	// #endregion

	ngOnChanges(): void {
		this.studentOptions.set(
			this.estudiantes().map((e) => ({ label: e.nombreCompleto, value: e.id })),
		);
		this.symptomOptions.set(
			this.sintomas().map((s) => ({ label: s.nombre, value: s.codigo })),
		);
	}

	onVisibleChange(visible: boolean): void {
		if (!visible) this.resetForm();
		this.visibleChange.emit(visible);
	}

	onSave(): void {
		if (!this.canSave()) return;

		this.save.emit({
			estudianteId: this.selectedStudent!,
			sintomas: this.selectedSymptoms,
			sintomaDetalle: this.showDetail() ? this.detail.trim() : undefined,
			observacion: this.observacion.trim() || undefined,
		});
	}

	private resetForm(): void {
		this.selectedStudent = null;
		this.selectedSymptoms = [];
		this.detail = '';
		this.observacion = '';
	}
}
