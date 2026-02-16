// #region Imports
import { Injectable, signal, computed } from '@angular/core';

// #endregion
// #region Implementation
export interface Attachment {
	id: number;
	name: string;
	type: 'pdf' | 'doc' | 'video' | 'image' | 'link';
	size: string;
	date: string;
	isRead: boolean;
	url?: string;
}

interface AttachmentsState {
	attachments: Attachment[];
	uploading: boolean;
	uploadProgress: number;
	error: string | null;
}

const initialState: AttachmentsState = {
	attachments: [
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
	],
	uploading: false,
	uploadProgress: 0,
	error: null,
};

@Injectable()
export class AttachmentsModalStore {
	// Estado privado
	private readonly _state = signal<AttachmentsState>(initialState);

	// Lecturas readonly
	readonly attachments = computed(() => this._state().attachments);
	readonly uploading = computed(() => this._state().uploading);
	readonly uploadProgress = computed(() => this._state().uploadProgress);
	readonly error = computed(() => this._state().error);

	// Derivados
	readonly totalCount = computed(() => this.attachments().length);
	readonly unreadCount = computed(() => this.attachments().filter((a) => !a.isRead).length);

	// ViewModel
	readonly vm = computed(() => ({
		attachments: this.attachments(),
		uploading: this.uploading(),
		uploadProgress: this.uploadProgress(),
		error: this.error(),
		totalCount: this.totalCount(),
		unreadCount: this.unreadCount(),
		hasAttachments: this.attachments().length > 0,
	}));

	// Comandos de mutación
	setUploading(uploading: boolean): void {
		this._state.update((s) => ({ ...s, uploading }));
	}

	setUploadProgress(progress: number): void {
		this._state.update((s) => ({ ...s, uploadProgress: progress }));
	}

	addAttachment(attachment: Attachment): void {
		this._state.update((s) => ({
			...s,
			attachments: [attachment, ...s.attachments],
		}));
	}

	markAsRead(attachmentId: number): void {
		this._state.update((s) => ({
			...s,
			attachments: s.attachments.map((a) => (a.id === attachmentId ? { ...a, isRead: true } : a)),
		}));
	}

	setError(error: string | null): void {
		this._state.update((s) => ({ ...s, error }));
	}

	clearError(): void {
		this.setError(null);
	}

	reset(): void {
		this._state.set(initialState);
	}
}
// #endregion
