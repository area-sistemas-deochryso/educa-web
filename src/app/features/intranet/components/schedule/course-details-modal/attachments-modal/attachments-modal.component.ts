// #region Imports
import { Component, EventEmitter, Input, Output, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FileUploadModule } from 'primeng/fileupload';
import { AttachmentsModalStore, type Attachment } from './attachments-modal.store';
import { AttachmentsModalFacade } from './attachments-modal.facade';

// #endregion
// #region Implementation
@Component({
	selector: 'app-attachments-modal',
	standalone: true,
	imports: [CommonModule, DialogModule, ButtonModule, ProgressSpinnerModule, FileUploadModule],
	providers: [AttachmentsModalStore, AttachmentsModalFacade],
	templateUrl: './attachments-modal.component.html',
	styleUrl: './attachments-modal.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * UI component for the attachments modal.
 * Delegates all side effects to {@link AttachmentsModalFacade}.
 *
 * @example
 * <app-attachments-modal
 *   [(visible)]="isOpen"
 *   [weekName]="weekTitle"
 *   [weekId]="weekId">
 * </app-attachments-modal>
 */
export class AttachmentsModalComponent {
	private readonly facade = inject(AttachmentsModalFacade);

	// #region Inputs/Outputs
	/** Whether the modal is visible. */
	@Input() visible = false;
	/** Label for the week shown in the modal header. */
	@Input() weekName = '';
	/** Week id used for upload and delete actions. */
	@Input() weekId = 0;
	/** Emits when visibility changes. */
	@Output() visibleChange = new EventEmitter<boolean>();
	// #endregion

	// #region Facade state
	/** View model stream for UI binding. */
	readonly vm = this.facade.vm;
	// #endregion

	// #region Dialog handlers
	/**
	 * Sync visibility and emit the two way binding event.
	 *
	 * @param value New visibility state.
	 *
	 * @example
	 * onVisibleChange(false);
	 */
	onVisibleChange(value: boolean): void {
		this.visible = value;
		this.visibleChange.emit(value);
	}
	// #endregion

	// #region Event handlers
	/**
	 * Resolve the icon class for a file type.
	 *
	 * @param type Normalized type key.
	 * @returns PrimeIcons class for the UI.
	 *
	 * @example
	 * const icon = getIcon('pdf');
	 */
	getIcon(type: string): string {
		const icons: Record<string, string> = {
			pdf: 'pi-file-pdf',
			doc: 'pi-file-word',
			video: 'pi-video',
			image: 'pi-image',
			link: 'pi-external-link',
		};
		return icons[type] || 'pi-file';
	}

	/**
	 * Handle file selection from the upload component.
	 *
	 * @param event PrimeNG FileUpload select event payload.
	 */
	onFileSelect(event: { files: File[] }): void {
		const files = event.files;
		if (files && files.length > 0) {
			this.facade.uploadMultipleFiles(this.weekId, files);
		}
	}

	/**
	 * Download and mark an attachment as read.
	 *
	 * @param attachment Attachment to open.
	 */
	onDownloadAttachment(attachment: Attachment): void {
		this.facade.downloadAttachment(attachment);
	}

	/**
	 * Delete an attachment using the facade.
	 *
	 * @param attachment Attachment to delete.
	 */
	onDeleteAttachment(attachment: Attachment): void {
		this.facade.deleteAttachment(attachment);
	}
	// #endregion
}
// #endregion
