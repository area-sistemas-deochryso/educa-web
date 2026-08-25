import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JustificarInasistenciaContext } from '@features/intranet/pages/estudiante/models';
import { EduButton, EduDialog, EduFileUpload, EduMessage, EduTextarea } from '@edu-ui';

const MAX_FILE_SIZE = 10485760;
const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.webp';

@Component({
	selector: 'app-justificar-inasistencia-dialog',
	standalone: true,
	imports: [CommonModule, FormsModule, EduDialog, EduFileUpload, EduTextarea, EduButton, EduMessage],
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
						[maxFileSize]="maxFileSize"
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

			.file-info {
				display: flex;
				align-items: center;
				gap: 0.5rem;
				font-size: 0.85rem;
				color: var(--text-color-secondary);
			}
		`],
})
export class JustificarInasistenciaDialogComponent {
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
	readonly maxFileSize = MAX_FILE_SIZE;
	readonly acceptedTypes = ACCEPTED_TYPES;
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
		if (event.files.length > 0) {
			this.selectedFile.set(event.files[0]);
		}
	}

	onFileClear(): void {
		this.selectedFile.set(null);
	}

	onSave(): void {
		const ctx = this.contexto();
		if (!ctx || !this.canSave()) return;

		const formData = new FormData();
		formData.append('AsistenciaCursoId', ctx.asistenciaCursoId.toString());
		if (this.comentario.trim()) {
			formData.append('Comentario', this.comentario.trim());
		}
		formData.append('documento', this.selectedFile()!);

		this.save.emit({ asistenciaCursoId: ctx.asistenciaCursoId, formData });
	}

	formatSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	private resetForm(): void {
		this.comentario = '';
		this.selectedFile.set(null);
	}
}
