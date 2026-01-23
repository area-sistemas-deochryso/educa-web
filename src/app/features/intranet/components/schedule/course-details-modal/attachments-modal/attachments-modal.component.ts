import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { logger } from '@core/helpers';

export interface Attachment {
	id: number;
	name: string;
	type: 'pdf' | 'doc' | 'video' | 'image' | 'link';
	size: string;
	date: string;
	isRead: boolean;
}

@Component({
	selector: 'app-attachments-modal',
	imports: [CommonModule, DialogModule],
	templateUrl: './attachments-modal.component.html',
	styleUrl: './attachments-modal.component.scss',
})
export class AttachmentsModalComponent {
	@Input() visible = false;
	@Input() weekName = '';
	@Output() visibleChange = new EventEmitter<boolean>();

	attachments: Attachment[] = [
		{
			id: 1,
			name: 'Clase 1 - Introducción al tema.pdf',
			type: 'pdf',
			size: '2.4 MB',
			date: '15/01/2026',
			isRead: true,
		},
		{
			id: 2,
			name: 'Material complementario.docx',
			type: 'doc',
			size: '1.1 MB',
			date: '15/01/2026',
			isRead: false,
		},
		{
			id: 3,
			name: 'Video explicativo - Conceptos básicos',
			type: 'video',
			size: '45 MB',
			date: '16/01/2026',
			isRead: false,
		},
		{
			id: 4,
			name: 'Diapositivas de la clase.pdf',
			type: 'pdf',
			size: '3.8 MB',
			date: '17/01/2026',
			isRead: false,
		},
		{
			id: 5,
			name: 'Enlace a recurso externo',
			type: 'link',
			size: '-',
			date: '17/01/2026',
			isRead: false,
		},
	];

	onVisibleChange(value: boolean): void {
		this.visible = value;
		this.visibleChange.emit(value);
	}

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

	markAsRead(attachment: Attachment): void {
		attachment.isRead = true;
	}

	downloadAttachment(attachment: Attachment): void {
		this.markAsRead(attachment);
		logger.log('Descargando:', attachment.name);
	}
}
