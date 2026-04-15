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
