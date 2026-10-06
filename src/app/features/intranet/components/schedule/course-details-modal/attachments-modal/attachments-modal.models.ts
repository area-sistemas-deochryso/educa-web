/**
 * Attachment item shown in the modal list.
 */
export interface Attachment {
	/** Attachment id from API. */
	id: number;
	/** Display name for the file. */
	name: string;
	/** MIME type reported at upload time; `app-file-row` falls back to the file extension when null. */
	mimeType: string | null;
	/** File size in bytes; `app-file-row` formats it. */
	sizeBytes: number | null;
	/** Localized date string for display. */
	date: string;
	/** True when user has opened the attachment. */
	isRead: boolean;
	/** Public URL to open the attachment. */
	url?: string;
}
