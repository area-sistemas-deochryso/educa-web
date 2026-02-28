// #region Imports
import { Injectable, signal, computed } from '@angular/core';

// #endregion
// #region Models
/**
 * Attachment item shown in the modal list.
 */
export interface Attachment {
	/** Attachment id from API. */
	id: number;
	/** Display name for the file. */
	name: string;
	/** Normalized file type for UI icons. */
	type: 'pdf' | 'doc' | 'video' | 'image' | 'link';
	/** Human readable file size. */
	size: string;
	/** Localized date string for display. */
	date: string;
	/** True when user has opened the attachment. */
	isRead: boolean;
	/** Public URL to open the attachment. */
	url?: string;
}

/**
 * Internal state for the attachments modal.
 */
interface AttachmentsState {
	/** Current attachment list. */
	attachments: Attachment[];
	/** True while loading data. */
	loading: boolean;
	/** True while uploading files. */
	uploading: boolean;
	/** Upload progress from 0 to 100. */
	uploadProgress: number;
	/** Last error message, if any. */
	error: string | null;
}

const initialState: AttachmentsState = {
	attachments: [],
	loading: false,
	uploading: false,
	uploadProgress: 0,
	error: null,
};
// #endregion

// #region Store
/**
 * Store for attachments modal state.
 * Uses Angular signals for state and computed values.
 *
 * @example
 * const store = inject(AttachmentsModalStore);
 * store.setLoading(true);
 */
@Injectable()
export class AttachmentsModalStore {
	// #region Private state
	/** Internal mutable state signal. */
	private readonly _state = signal<AttachmentsState>(initialState);
	// #endregion

	// #region Readonly selectors
	/** Current attachment list. */
	readonly attachments = computed(() => this._state().attachments);
	/** True while loading data. */
	readonly loading = computed(() => this._state().loading);
	/** True while uploading files. */
	readonly uploading = computed(() => this._state().uploading);
	/** Upload progress from 0 to 100. */
	readonly uploadProgress = computed(() => this._state().uploadProgress);
	/** Last error message, if any. */
	readonly error = computed(() => this._state().error);
	// #endregion

	// #region Computed
	/** Total number of attachments. */
	readonly totalCount = computed(() => this.attachments().length);
	/** Number of unread attachments. */
	readonly unreadCount = computed(() => this.attachments().filter((a) => !a.isRead).length);
	// #endregion

	// #region ViewModel
	/** Aggregated view model for UI binding. */
	readonly vm = computed(() => ({
		attachments: this.attachments(),
		loading: this.loading(),
		uploading: this.uploading(),
		uploadProgress: this.uploadProgress(),
		error: this.error(),
		totalCount: this.totalCount(),
		unreadCount: this.unreadCount(),
		hasAttachments: this.attachments().length > 0,
	}));
	// #endregion

	// #region Mutation commands
	/**
	 * Set loading flag.
	 *
	 * @param loading True while loading.
	 *
	 * @example
	 * store.setLoading(true);
	 */
	setLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, loading }));
	}
	/**
	 * Set uploading flag.
	 *
	 * @param uploading True while uploading.
	 *
	 * @example
	 * store.setUploading(true);
	 */
	setUploading(uploading: boolean): void {
		this._state.update((s) => ({ ...s, uploading }));
	}
	/**
	 * Set upload progress percentage.
	 *
	 * @param progress Progress from 0 to 100.
	 *
	 * @example
	 * store.setUploadProgress(50);
	 */
	setUploadProgress(progress: number): void {
		this._state.update((s) => ({ ...s, uploadProgress: progress }));
	}
	/**
	 * Replace attachment list.
	 *
	 * @param attachments Full attachment list.
	 *
	 * @example
	 * store.setAttachments([{ id: 1, name: 'file.pdf', type: 'pdf', size: '2 MB', date: '01/01/2026', isRead: false }]);
	 */
	setAttachments(attachments: Attachment[]): void {
		this._state.update((s) => ({ ...s, attachments }));
	}
	/**
	 * Prepend a new attachment to the list.
	 *
	 * @param attachment Attachment to add.
	 *
	 * @example
	 * store.addAttachment({ id: 2, name: 'file.docx', type: 'doc', size: '1 MB', date: '01/02/2026', isRead: false });
	 */
	addAttachment(attachment: Attachment): void {
		this._state.update((s) => ({
			...s,
			attachments: [attachment, ...s.attachments],
		}));
	}
	/**
	 * Remove an attachment by id.
	 *
	 * @param attachmentId Attachment id.
	 *
	 * @example
	 * store.removeAttachment(1);
	 */
	removeAttachment(attachmentId: number): void {
		this._state.update((s) => ({
			...s,
			attachments: s.attachments.filter((a) => a.id !== attachmentId),
		}));
	}
	/**
	 * Mark an attachment as read.
	 *
	 * @param attachmentId Attachment id.
	 *
	 * @example
	 * store.markAsRead(1);
	 */
	markAsRead(attachmentId: number): void {
		this._state.update((s) => ({
			...s,
			attachments: s.attachments.map((a) => (a.id === attachmentId ? { ...a, isRead: true } : a)),
		}));
	}
	/**
	 * Set error message.
	 *
	 * @param error Error message or null.
	 *
	 * @example
	 * store.setError('Upload failed');
	 */
	setError(error: string | null): void {
		this._state.update((s) => ({ ...s, error }));
	}
	/**
	 * Clear error message.
	 *
	 * @example
	 * store.clearError();
	 */
	clearError(): void {
		this.setError(null);
	}
	/**
	 * Reset state to initial values.
	 * Also clears error and progress values.
	 *
	 * @example
	 * store.reset();
	 */
	reset(): void {
		this._state.set(initialState);
	}
	// #endregion
}
// #endregion
