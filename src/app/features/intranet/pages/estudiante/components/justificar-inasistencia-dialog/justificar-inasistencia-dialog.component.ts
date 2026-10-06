import { Component, ChangeDetectionStrategy, inject, input, output, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JustificarInasistenciaContext } from '@features/intranet/pages/estudiante/models';
import { EduButton, EduDialog, EduFileUpload, EduMessage, EduTextarea, EduTooltip } from '@edu-ui';
import { ErrorHandlerService } from '@core/services';
import { FileRowComponent, JUSTIFICATION_UPLOAD_ACCEPT, JUSTIFICATION_UPLOAD_LIMITS, validateUploadFile } from '@shared/components';

@Component({
	selector: 'app-justificar-inasistencia-dialog',
	standalone: true,
	imports: [DatePipe, FormsModule, EduDialog, EduFileUpload, EduTextarea, EduButton, EduMessage, EduTooltip, FileRowComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<edu-dialog
			header="Justificar inasistencia"
			[visible]="visible()"
			(visibleChange)="onVisibleChange($event)"
			[modal]="true"
			[style]="{ width: '500px', maxWidth: '95vw' }"
		>
			@if (contexto(); as ctx) {
				<div class="form-grid">
					<p class="fecha-info">Falta del <strong>{{ ctx.fecha | date: 'dd/MM/yyyy' }}</strong></p>

					@if (ctx.motivoRechazoAnterior) {
						<edu-message severity="warn" [text]="'Solicitud anterior rechazada: ' + ctx.motivoRechazoAnterior" styleClass="w-full" />
					}

					<label>Documento de respaldo (PDF o imagen)</label>
					<edu-file-upload
						mode="basic"
						[auto]="false"
						data-info-anchor="estudiante-justificar-inasistencia-adjuntar"
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

					<label for="just-comentario">Comentario (opcional)</label>
					<textarea
						eduTextarea
						id="just-comentario"
						[(ngModel)]="comentario"
						placeholder="Comentario adicional..."
						[rows]="3"
						[maxlength]="500"
						class="w-full"
					></textarea>
				</div>
			}

			<ng-template #footer>
				<edu-button
					label="Cancelar"
					[text]="true"
					data-info-anchor="estudiante-justificar-inasistencia-cancelar"
					(click)="onVisibleChange(false)"
				/>
				<edu-button
					label="Enviar solicitud"
					icon="pi pi-check"
					data-info-anchor="estudiante-justificar-inasistencia-enviar"
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

			.fecha-info {
				margin: 0;
			}
		`],
})
export class JustificarInasistenciaDialogComponent {
	private readonly errorHandler = inject(ErrorHandlerService);

	// #region Inputs/Outputs
	readonly visible = input(false);
	readonly contexto = input<JustificarInasistenciaContext | null>(null);
	readonly saving = input(false);
	readonly visibleChange = output<boolean>();
	readonly save = output<{ asistenciaCursoId: number; formData: FormData }>();
	// #endregion

	// #region Estado local
	comentario = '';
	readonly selectedFile = signal<File | null>(null);
	readonly acceptedTypes = JUSTIFICATION_UPLOAD_ACCEPT;
	// #endregion

	readonly canSaveComputed = computed(() => this.selectedFile() !== null);

	canSave(): boolean {
		return this.canSaveComputed();
	}

	onVisibleChange(visible: boolean): void {
		if (!visible) this.resetForm();
		this.visibleChange.emit(visible);
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
		const ctx = this.contexto();
		const file = this.selectedFile();
		if (!ctx || !file) return;

		const formData = new FormData();
		formData.append('AsistenciaCursoId', ctx.asistenciaCursoId.toString());
		if (this.comentario.trim()) {
			formData.append('Comentario', this.comentario.trim());
		}
		formData.append('documento', file);

		this.save.emit({ asistenciaCursoId: ctx.asistenciaCursoId, formData });
	}

	private resetForm(): void {
		this.comentario = '';
		this.selectedFile.set(null);
	}
}
