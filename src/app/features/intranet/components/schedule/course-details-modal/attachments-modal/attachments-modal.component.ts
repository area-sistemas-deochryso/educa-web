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
export class AttachmentsModalComponent {
	private readonly facade = inject(AttachmentsModalFacade);

	// * Inputs/outputs for dialog state and week label.
	@Input() visible = false;
	@Input() weekName = '';
	@Output() visibleChange = new EventEmitter<boolean>();

	// * ViewModel from facade.
	readonly vm = this.facade.vm;

	onVisibleChange(value: boolean): void {
		this.visible = value;
		this.visibleChange.emit(value);
	}

	getIcon(type: string): string {
		// * Map attachment type to icon.
		const icons: Record<string, string> = {
			pdf: 'pi-file-pdf',
			doc: 'pi-file-word',
			video: 'pi-video',
			image: 'pi-image',
			link: 'pi-external-link',
		};
		return icons[type] || 'pi-file';
	}

	onFileSelect(event: { files: File[] }): void {
		// * Delegate upload to facade.
		const files = event.files;
		if (files && files.length > 0) {
			this.facade.uploadMultipleFiles(files);
		}
	}

	onDownloadAttachment(attachment: Attachment): void {
		this.facade.downloadAttachment(attachment);
	}
}
// #endregion
