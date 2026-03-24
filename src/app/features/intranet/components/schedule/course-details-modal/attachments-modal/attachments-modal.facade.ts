// #region Imports
import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BlobStorageService, ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { logger, extractErrorMessage, facadeErrorHandler } from '@core/helpers';
import { environment } from '@config';
import { ProfesorApiService } from '@features/intranet/pages/profesor/services/profesor-api.service';
import type {
	CursoContenidoArchivoDto,
	RegistrarArchivoRequest,
} from '@features/intranet/pages/profesor/models';
import { AttachmentsModalStore, type Attachment } from './attachments-modal.store';
import {
	UI_ADMIN_ERROR_DETAILS_DYNAMIC,
	UI_ATTACHMENT_MESSAGES,
	UI_GENERIC_MESSAGES,
	UI_SUMMARIES,
} from '@app/shared/constants';

// #endregion
// #region Constants
/** Maximum allowed file size in bytes (50 MB). */
const MAX_FILE_SIZE = 50000000;
/** Base API endpoint for course content resources. */
const CONTENIDO_URL = `${environment.apiUrl}/api/CursoContenido`;
// #endregion

// #region Implementation
/**
 * Facade for the attachments modal.
 * Coordinates validation, blob upload, WAL metadata registration, and store updates.
 *
 * @remarks
 * Flow summary:
 * 1) Validate the file (size, empty, missing).
 * 2) Upload the file to Blob Storage (no WAL, File is not JSON serializable).
 * 3) Register metadata with WAL to keep UI state in sync with the API.
 *
 * @example
 * const facade = inject(AttachmentsModalFacade);
 * facade.uploadFile(semanaId, file);
 */
@Injectable()
export class AttachmentsModalFacade {
	// #region Dependencies
	private readonly api = inject(ProfesorApiService);
	private readonly blobService = inject(BlobStorageService);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly wal = inject(WalFacadeHelper);
	private readonly store = inject(AttachmentsModalStore);
	private readonly destroyRef = inject(DestroyRef);
	private readonly errHandler = facadeErrorHandler({
		tag: 'AttachmentsModalFacade',
		errorHandler: this.errorHandler,
	});
	// #endregion

	// #region Exposed state
	/** View model stream for UI binding. */
	readonly vm = this.store.vm;
	// #endregion

	// #region Upload (hybrid: direct blob plus WAL metadata)

	/**
	 * Hybrid flow: direct blob upload (no WAL) then metadata registration (WAL).
	 * Blob upload cannot be WAL protected because File is not JSON serializable.
	 *
	 * @param semanaId Week ID that owns the attachment.
	 * @param file File selected by the user.
	 *
	 * @example
	 * facade.uploadFile(semanaId, file);
	 */
	uploadFile(semanaId: number, file: File): void {
		const validationError = this.validateFile(file);
		if (validationError) {
			logger.error(validationError);
			this.errorHandler.showError(UI_SUMMARIES.error, validationError);
			return;
		}

		this.store.setUploading(true);
		this.store.setUploadProgress(0);
		this.store.clearError();

		// Step 1: Direct upload to BlobStorage (no WAL).
		this.api
			.uploadFile(file)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blobResponse) => {
					// Step 2: Register metadata with WAL.
					const request: RegistrarArchivoRequest = {
						nombreArchivo: file.name,
						urlArchivo: blobResponse.url,
						tipoArchivo: file.type || null,
						tamanoBytes: file.size,
					};

					this.wal.execute({
						operation: 'CREATE',
						resourceType: 'CursoContenidoArchivo',
						endpoint: `${CONTENIDO_URL}/semana/${semanaId}/archivo`,
						method: 'POST',
						payload: request,
						http$: () => this.api.registrarArchivo(semanaId, request),
						optimistic: {
							apply: () => {
								this.store.setUploading(false);
								this.store.setUploadProgress(100);
								this.errorHandler.showSuccess(
									UI_SUMMARIES.success,
									UI_ATTACHMENT_MESSAGES.uploadSuccess,
								);
							},
							rollback: () => {
								this.store.setUploading(false);
							},
						},
						onCommit: (archivo) => {
							this.store.addAttachment(this.mapToAttachment(archivo));
						},
						onError: (err) => this.errHandler.handle(err, 'registrar archivo'),
					});
				},
				error: (error) => {
					logger.error('AttachmentsModalFacade: Upload failed', error);
					this.store.setUploading(false);
					this.store.setUploadProgress(0);

					const errorMsg = extractErrorMessage(error, UI_GENERIC_MESSAGES.unknownError);
					this.store.setError(errorMsg);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS_DYNAMIC.uploadFileFailed(errorMsg),
					);
				},
			});
	}

	/**
	 * Upload multiple files by delegating to {@link uploadFile}.
	 * Each file is validated and uploaded independently.
	 *
	 * @param semanaId Week ID that owns the attachments.
	 * @param files List of files to upload.
	 *
	 * @example
	 * facade.uploadMultipleFiles(semanaId, [fileA, fileB]);
	 */
	uploadMultipleFiles(semanaId: number, files: File[]): void {
		if (!files || files.length === 0) return;
		files.forEach((file) => this.uploadFile(semanaId, file));
	}

	// #endregion
	// #region Delete (WAL with optimistic removal and rollback)

	/**
	 * Delete an attachment with optimistic UI removal and rollback on failure.
	 * The WAL action removes the item first, then restores it if the API fails.
	 *
	 * @param attachment Attachment to delete.
	 *
	 * @example
	 * facade.deleteAttachment(attachment);
	 */
	deleteAttachment(attachment: Attachment): void {
		const snapshot = attachment;

		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'CursoContenidoArchivo',
			resourceId: attachment.id,
			endpoint: `${CONTENIDO_URL}/archivo/${attachment.id}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminarArchivo(attachment.id),
			optimistic: {
				apply: () => {
					this.store.removeAttachment(attachment.id);
				},
				rollback: () => {
					this.store.addAttachment(snapshot);
				},
			},
			onCommit: () => {},
			onError: (err) => this.errHandler.handle(err, 'eliminar archivo'),
		});
	}

	// #endregion
	// #region Otros comandos

	/**
	 * Mark an attachment as read in local state only.
	 * Does not call the API.
	 *
	 * @param attachmentId Attachment ID to mark as read.
	 *
	 * @example
	 * facade.markAttachmentAsRead(attachmentId);
	 */
	markAttachmentAsRead(attachmentId: number): void {
		this.store.markAsRead(attachmentId);
	}

	/**
	 * Open the attachment URL in a new tab and mark it as read.
	 * If there is no URL, it logs a message only.
	 *
	 * @param attachment Attachment to download.
	 *
	 * @example
	 * facade.downloadAttachment(attachment);
	 */
	downloadAttachment(attachment: Attachment): void {
		this.markAttachmentAsRead(attachment.id);

		if (attachment.url) {
			window.open(attachment.url, '_blank');
		} else {
			logger.log('Downloading:', attachment.name);
		}
	}

	// #endregion
	// #region Private helpers

	/**
	 * Map API DTO into local UI attachment model.
	 *
	 * @param dto API attachment DTO.
	 * @returns UI attachment model.
	 */
	private mapToAttachment(dto: CursoContenidoArchivoDto): Attachment {
		return {
			id: dto.id,
			name: dto.nombreArchivo,
			type: this.blobService.getFileType(dto.nombreArchivo),
			size: dto.tamanoBytes ? this.blobService.formatFileSize(dto.tamanoBytes) : '-',
			date: new Date(dto.fechaReg).toLocaleDateString('es-PE'),
			isRead: false,
			url: dto.urlArchivo,
		};
	}

	/**
	 * Validate a file before upload.
	 * Enforces presence, non empty size, and maximum size.
	 *
	 * @param file File selected by the user.
	 * @returns Error message when invalid; null when valid.
	 */
	private validateFile(file: File): string | null {
		if (!file) return UI_ATTACHMENT_MESSAGES.fileMissing;
		if (file.size === 0) return UI_ATTACHMENT_MESSAGES.fileEmpty;
		if (file.size > MAX_FILE_SIZE) return UI_ATTACHMENT_MESSAGES.fileTooLarge(MAX_FILE_SIZE / 1000000);
		return null;
	}

	// #endregion
}
// #endregion
