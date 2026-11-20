export const MAILERSEND_ESTADOS = ['queued', 'sent', 'delivered', 'rejected'] as const;
export type MailerSendEstado = (typeof MAILERSEND_ESTADOS)[number];

export interface MailerSendEmail {
	id: string;
	from: string | null;
	to: string | null;
	subject: string | null;
	messageId: string | null;
	status: string;
	suppressionReason: string | null;
	interaction: string[];
	tags: string[];
	createdAt: string | null;
	updatedAt: string | null;
}

export interface MailerSendEmailsPage {
	items: MailerSendEmail[];
	page: number;
	limit: number;
	hasNext: boolean;
}

export interface MailerSendEmailsFilter {
	desde: Date;
	hasta: Date;
	estados: MailerSendEstado[];
	destinatario: string;
	page: number;
	limit: number;
}
