import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BlobStorageService } from '@core/services';
import { ErrorHandlerService } from '@core/services';
import { logger } from '@core/helpers';
import { AttachmentsModalStore, type Attachment } from './attachments-modal.store';
import {
	UI_ADMIN_ERROR_DETAILS_DYNAMIC,
	UI_ATTACHMENT_MESSAGES,
	UI_GENERIC_MESSAGES,
	UI_SUMMARIES,
} from '@app/shared/constants';

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
			this.errorHandler.showError(UI_SUMMARIES.error, validationError);
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
					this.errorHandler.showSuccess(
						UI_SUMMARIES.success,
						UI_ATTACHMENT_MESSAGES.uploadSuccess,
					);
				},
				error: (error) => {
					logger.error('Error al subir archivo:', error);
					this.store.setUploading(false);
					this.store.setUploadProgress(0);

					const errorMsg =
						error?.error?.message || error?.message || UI_GENERIC_MESSAGES.unknownError;
					this.store.setError(errorMsg);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS_DYNAMIC.uploadFileFailed(errorMsg),
					);
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
			return UI_ATTACHMENT_MESSAGES.fileMissing;
		}

		if (file.size === 0) {
			return UI_ATTACHMENT_MESSAGES.fileEmpty;
		}

		if (file.size > MAX_FILE_SIZE) {
			return UI_ATTACHMENT_MESSAGES.fileTooLarge(MAX_FILE_SIZE / 1000000);
		}

		return null;
	}
}
