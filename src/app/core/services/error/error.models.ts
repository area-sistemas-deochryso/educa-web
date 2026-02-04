// * Error types + friendly HTTP messages.
import { UI_HTTP_ERROR_MESSAGES } from '@app/shared/constants';

export type ErrorSeverity = 'info' | 'warn' | 'error' | 'success';
export type ErrorSource = 'http' | 'client' | 'validation' | 'unknown';

export interface AppError {
	id: string;
	message: string;
	severity: ErrorSeverity;
	source: ErrorSource;
	timestamp: Date;
	statusCode?: number;
	originalError?: unknown;
	context?: Record<string, unknown>;
}

export interface HttpErrorDetails {
	url: string;
	method: string;
	statusCode: number;
	statusText: string;
	message: string;
	body?: unknown;
}

export interface ErrorNotification {
	severity: ErrorSeverity;
	summary: string;
	detail: string;
	life?: number;
	sticky?: boolean;
}

/**
 * Mapeo de codigos HTTP a mensajes amigables en espanol
 */
export const HTTP_ERROR_MESSAGES: Record<number, string> = {
	...UI_HTTP_ERROR_MESSAGES,
};
