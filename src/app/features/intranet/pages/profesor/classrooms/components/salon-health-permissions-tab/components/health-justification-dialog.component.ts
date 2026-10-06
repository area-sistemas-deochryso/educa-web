import { Component, ChangeDetectionStrategy, inject, input, output, signal, computed, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StudentForHealthDto, DateValidationResult } from '@features/intranet/pages/profesor/models';
import { EduButton, EduDatePicker, EduDialog, EduFileUpload, EduSelect, EduTag, EduTextarea, EduTooltip } from '@edu-ui';
import { ErrorHandlerService } from '@core/services';
import { FileRowComponent, JUSTIFICATION_UPLOAD_ACCEPT, JUSTIFICATION_UPLOAD_LIMITS, validateUploadFile } from '@shared/components';

@Component({
	selector: 'app-health-justification-dialog',
	standalone: true,
	imports: [
		FormsModule, EduDialog, EduSelect, EduDatePicker,
		EduFileUpload, EduTextarea, EduButton, EduTag, EduTooltip, FileRowComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<edu-dialog
			header="Justificación Médica"
			[visible]="visible()"
			(visibleChange)="onVisibleChange($event)"
			[modal]="true"
			[style]="{ width: '600px', maxWidth: '95vw' }"
		>
			<div class="form-grid">
				<!-- Estudiante -->
				<label for="just-student">Estudiante</label>
				<edu-select
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
				<edu-datepicker
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
									<edu-tag value="Válida" severity="success" />
								} @else {
									<edu-tag [value]="fv.razon ?? 'No válida'" severity="danger" />
								}
							</div>
						}
					</div>
				}

				<!-- Documento -->
				<label>Documento médico (PDF o imagen)</label>
				<edu-file-upload
					mode="basic"
					[auto]="false"
					data-info-anchor="profesor-health-justificacion-adjuntar"
					[accept]="acceptedTypes"
					chooseLabel="Seleccionar archivo"
					chooseIcon="pi pi-upload"
					(onSelect)="onFileSelect($event)"
					(onClear)="onFileClear()"
					styleClass="w-full"
				/>
				@if (selectedFile(); as file) {
					<app-file-row [name]="file.name" [mimeType]="file.type || null" [sizeBytes]="file.size" [small]="true">
						<span actions>
							<edu-button
								icon="pi pi-times"
								[text]="true"
								[rounded]="true"
								size="small"
								severity="danger"
								eduTooltip="Quitar archivo"
								eduTooltipPosition="top"
								(click)="onFileClear()"
								[pt]="{ root: { 'aria-label': 'Quitar archivo' } }"
							/>
						</span>
					</app-file-row>
				}

				<!-- Observacion -->
				<label for="just-obs">Observación (opcional)</label>
				<textarea
					eduTextarea
					id="just-obs"
					[(ngModel)]="observacion"
					placeholder="Observación adicional..."
					[rows]="2"
					[maxlength]="500"
					class="w-full"
				></textarea>
			</div>

			<ng-template #footer>
				<edu-button
					label="Cancelar"
					[text]="true"
					data-info-anchor="profesor-health-justificacion-cancelar"
					(click)="onVisibleChange(false)"
				/>
				<edu-button
					label="Registrar Justificación"
					icon="pi pi-check"
					data-info-anchor="profesor-health-justificacion-guardar"
					[disabled]="!canSave() || saving()"
					[loading]="saving()"
					(click)="onSave()"
				/>
			</ng-template>
		</edu-dialog>
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
		`],
})
export class HealthJustificationDialogComponent implements OnChanges {
	private readonly errorHandler = inject(ErrorHandlerService);

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
	readonly acceptedTypes = JUSTIFICATION_UPLOAD_ACCEPT;
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
		const file = event.files[0];
		if (!file) return;
		const error = validateUploadFile(file, JUSTIFICATION_UPLOAD_LIMITS);
		if (error) {
			this.errorHandler.showWarning('Archivo no válido', error);
			return;
		}
		this.selectedFile.set(file);
	}

	onFileClear(): void {
		this.selectedFile.set(null);
	}

	onSave(): void {
		if (!this.canSave()) return;
		const estudianteId = this.selectedStudent;
		const file = this.selectedFile();
		if (!estudianteId || !file) return;

		const formData = new FormData();
		formData.append('EstudianteId', estudianteId.toString());
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

		formData.append('documento', file);

		this.save.emit(formData);
	}

	private resetForm(): void {
		this.selectedStudent = null;
		this.selectedDates = [];
		this.observacion = '';
		this.selectedFile.set(null);
	}
}
