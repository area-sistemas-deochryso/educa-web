import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { FileUploadModule } from 'primeng/fileupload';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { StudentForHealthDto, DateValidationResult } from '@features/intranet/pages/profesor/models';

@Component({
	selector: 'app-health-justification-dialog',
	standalone: true,
	imports: [
		CommonModule, FormsModule, DialogModule, SelectModule, DatePickerModule,
		FileUploadModule, TextareaModule, ButtonModule, TagModule,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<p-dialog
			header="Justificación Médica"
			[visible]="visible()"
			(visibleChange)="onVisibleChange($event)"
			[modal]="true"
			[style]="{ width: '600px', maxWidth: '95vw' }"
		>
			<div class="form-grid">
				<!-- Estudiante -->
				<label for="just-student">Estudiante</label>
				<p-select
					id="just-student"
					[options]="studentOptions()"
					[(ngModel)]="selectedStudent"
					optionLabel="label"
					optionValue="value"
					placeholder="Seleccionar estudiante"
					[filter]="true"
					filterPlaceholder="Buscar..."
					appendTo="body"
					styleClass="w-full"
					(ngModelChange)="onStudentChange($event)"
				/>

				<!-- Fechas -->
				<label>Días a justificar</label>
				<p-datepicker
					[(ngModel)]="selectedDates"
					selectionMode="multiple"
					[inline]="true"
					[showIcon]="false"
					dateFormat="dd/mm/yy"
					[maxDate]="today"
					[minDate]="yearStart"
					(ngModelChange)="onDatesChange($event)"
					styleClass="w-full"
				/>

				<!-- Validacion de fechas -->
				@if (fechasValidacion().length > 0) {
					<div class="fecha-validacion-list">
						@for (fv of fechasValidacion(); track fv.fecha) {
							<div class="fecha-validacion-item">
								<span>{{ fv.fecha }}</span>
								@if (fv.valida) {
									<p-tag value="Válida" severity="success" />
								} @else {
									<p-tag [value]="fv.razon ?? 'No válida'" severity="danger" />
								}
							</div>
						}
					</div>
				}

				<!-- Documento -->
				<label>Documento médico (PDF o imagen)</label>
				<p-fileUpload
					mode="basic"
					[auto]="false"
					accept=".pdf,.jpg,.jpeg,.png,.webp"
					[maxFileSize]="10485760"
					chooseLabel="Seleccionar archivo"
					chooseIcon="pi pi-upload"
					(onSelect)="onFileSelect($event)"
					(onClear)="onFileClear()"
					styleClass="w-full"
				/>
				@if (selectedFile()) {
					<div class="file-info">
						<i class="pi pi-file"></i>
						<span>{{ selectedFile()!.name }} ({{ formatSize(selectedFile()!.size) }})</span>
					</div>
				}

				<!-- Observacion -->
				<label for="just-obs">Observación (opcional)</label>
				<textarea
					pTextarea
					id="just-obs"
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
					label="Registrar Justificación"
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

			.fecha-validacion-list {
				display: flex;
				flex-direction: column;
				gap: 0.25rem;
				max-height: 150px;
				overflow-y: auto;
			}

			.fecha-validacion-item {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 0.25rem 0.5rem;
				font-size: 0.85rem;
			}

			.file-info {
				display: flex;
				align-items: center;
				gap: 0.5rem;
				font-size: 0.85rem;
				color: var(--text-color-secondary);
			}
		`,
	],
})
export class HealthJustificationDialogComponent {
	// #region Inputs/Outputs
	readonly visible = input(false);
	readonly estudiantes = input<StudentForHealthDto[]>([]);
	readonly fechasValidacion = input<DateValidationResult[]>([]);
	readonly saving = input(false);
	readonly salonId = input.required<number>();
	readonly visibleChange = output<boolean>();
	readonly save = output<FormData>();
	readonly validateDates = output<{ estudianteId: number; fechas: Date[] }>();
	// #endregion

	// #region Estado local
	selectedStudent: number | null = null;
	selectedDates: Date[] = [];
	observacion = '';
	readonly selectedFile = signal<File | null>(null);
	readonly today = new Date();
	readonly yearStart = new Date(this.today.getFullYear(), 0, 1);

	readonly studentOptions = signal<{ label: string; value: number }[]>([]);

	readonly hasAnyValidDate = computed(() => {
		const validations = this.fechasValidacion();
		return validations.length > 0 && validations.some((v) => v.valida);
	});
	// #endregion

	canSave(): boolean {
		return (
			this.selectedStudent !== null &&
			this.selectedDates.length > 0 &&
			this.selectedFile() !== null &&
			(this.fechasValidacion().length === 0 || this.hasAnyValidDate())
		);
	}

	ngOnChanges(): void {
		this.studentOptions.set(
			this.estudiantes().map((e) => ({ label: e.nombreCompleto, value: e.id })),
		);
	}

	onVisibleChange(visible: boolean): void {
		if (!visible) this.resetForm();
		this.visibleChange.emit(visible);
	}

	onStudentChange(studentId: number): void {
		if (studentId && this.selectedDates.length > 0) {
			this.validateDates.emit({ estudianteId: studentId, fechas: this.selectedDates });
		}
	}

	onDatesChange(dates: Date[]): void {
		if (this.selectedStudent && dates.length > 0) {
			this.validateDates.emit({ estudianteId: this.selectedStudent, fechas: dates });
		}
	}

	onFileSelect(event: { files: File[] }): void {
		if (event.files.length > 0) {
			this.selectedFile.set(event.files[0]);
		}
	}

	onFileClear(): void {
		this.selectedFile.set(null);
	}

	onSave(): void {
		if (!this.canSave()) return;

		const formData = new FormData();
		formData.append('EstudianteId', this.selectedStudent!.toString());
		formData.append('SalonId', this.salonId().toString());

		// Solo enviar fechas validadas como válidas
		const validaciones = this.fechasValidacion();
		const fechasValidas = validaciones.length > 0
			? this.selectedDates.filter((d) => {
					const key = d.toISOString().split('T')[0];
					return validaciones.some((v) => v.fecha === key && v.valida);
				})
			: this.selectedDates;

		for (const fecha of fechasValidas) {
			formData.append('Fechas', fecha.toISOString().split('T')[0]);
		}

		if (this.observacion.trim()) {
			formData.append('Observacion', this.observacion.trim());
		}

		formData.append('documento', this.selectedFile()!);

		this.save.emit(formData);
	}

	formatSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	private resetForm(): void {
		this.selectedStudent = null;
		this.selectedDates = [];
		this.observacion = '';
		this.selectedFile.set(null);
	}
}
