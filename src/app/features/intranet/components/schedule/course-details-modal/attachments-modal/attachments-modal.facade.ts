import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BlobStorageService } from '@core/services';
import { ErrorHandlerService } from '@core/services';
import { logger } from '@core/helpers';
import { AttachmentsModalStore, type Attachment } from './attachments-modal.store';

const MAX_FILE_SIZE = 50000000; // 50MB
const CONTAINER_NAME = 'course-attachments';

@Injectable()
export class AttachmentsModalFacade {
	private readonly blobService = inject(BlobStorageService);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly store = inject(AttachmentsModalStore);
	private readonly destroyRef = inject(DestroyRef);

	// Expone ViewModel
	readonly vm = this.store.vm;

	// Comandos
	uploadFile(file: File): void {
		// Validación del archivo
		const validationError = this.validateFile(file);
		if (validationError) {
			logger.error(validationError);
			this.errorHandler.showError('Error', validationError);
			return;
		}

		// Iniciar upload
		this.store.setUploading(true);
		this.store.setUploadProgress(0);
		this.store.clearError();

		this.blobService
			.uploadFile(file, CONTAINER_NAME, true)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					// Crear nuevo attachment
					const newAttachment: Attachment = {
						id: this.store.totalCount() + 1,
						name: file.name,
						type: this.blobService.getFileType(file.name),
						size: this.blobService.formatFileSize(file.size),
						date: new Date().toLocaleDateString('es-PE'),
						isRead: true,
						url: response.url,
					};

					// Actualizar estado
					this.store.addAttachment(newAttachment);
					this.store.setUploading(false);
					this.store.setUploadProgress(100);

					// Notificar éxito
					this.errorHandler.showSuccess('Éxito', 'Archivo subido correctamente');
				},
				error: (error) => {
					logger.error('Error al subir archivo:', error);
					this.store.setUploading(false);
					this.store.setUploadProgress(0);

					const errorMsg = error?.error?.message || error?.message || 'Error desconocido';
					this.store.setError(errorMsg);
					this.errorHandler.showError('Error', `No se pudo subir el archivo: ${errorMsg}`);
				},
			});
	}

	uploadMultipleFiles(files: File[]): void {
		if (!files || files.length === 0) return;
		files.forEach((file) => this.uploadFile(file));
	}

	markAttachmentAsRead(attachmentId: number): void {
		this.store.markAsRead(attachmentId);
	}

	downloadAttachment(attachment: Attachment): void {
		this.markAttachmentAsRead(attachment.id);

		if (attachment.url) {
			window.open(attachment.url, '_blank');
		} else {
			logger.log('Descargando:', attachment.name);
		}
	}

	// Validación privada
	private validateFile(file: File): string | null {
		if (!file) {
			return 'No se seleccionó ningún archivo';
		}

		if (file.size === 0) {
			return 'El archivo está vacío';
		}

		if (file.size > MAX_FILE_SIZE) {
			return `El archivo es demasiado grande (máximo ${MAX_FILE_SIZE / 1000000}MB)`;
		}

		return null;
	}
}
