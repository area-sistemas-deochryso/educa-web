// #region Imports
import {
	AppError,
	ErrorNotification,
	ErrorSeverity,
	ErrorSource,
	HTTP_ERROR_MESSAGES,
	HttpErrorDetails,
} from './error.models';
import { Injectable, computed, inject, signal } from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';
import { logger } from '@core/helpers';
import {
	UI_CLIENT_ERROR_MESSAGE,
	UI_ERROR_SUMMARIES,
	UI_GENERIC_MESSAGES,
} from '@app/shared/constants';

// #endregion
// #region Implementation
@Injectable({
	providedIn: 'root',
})
export class ErrorHandlerService {
	// * Centralized error handling + notification state.

	// Estado con Signals
	private readonly _errors = signal<AppError[]>([]);
	private readonly _currentNotification = signal<ErrorNotification | null>(null);

	// Computed signals publicos
	readonly errors = this._errors.asReadonly();
	readonly currentNotification = this._currentNotification.asReadonly();
	readonly hasErrors = computed(() => this._errors().length > 0);
	readonly lastError = computed(() => this._errors()[this._errors().length - 1] ?? null);

	// Contador de errores por tipo
	readonly errorCounts = computed(() => {
		const errors = this._errors();
		return {
			http: errors.filter((e) => e.source === 'http').length,
			client: errors.filter((e) => e.source === 'client').length,
			validation: errors.filter((e) => e.source === 'validation').length,
		};
	});

	/**
	 * Maneja errores HTTP del interceptor
	 */
	handleHttpError(error: HttpErrorResponse, context?: Record<string, unknown>): AppError {
		const method =
			context && typeof context['method'] === 'string' ? context['method'] : undefined;
		const details = this.extractHttpDetails(error, method);
		const message = this.getHttpErrorMessage(error);

		// For 500+ errors, append short trace reference for support correlation
		const traceId = context?.['traceId'] as string | undefined;
		const displayMessage =
			error.status >= 500 && traceId
				? `${message} (Ref: ${traceId.substring(0, 8)})`
				: message;

		const appError = this.createError(displayMessage, 'error', 'http', {
			statusCode: error.status,
			originalError: error,
			context: { ...context, httpDetails: details },
		});

		this.showNotification({
			severity: 'error',
			summary: UI_ERROR_SUMMARIES.connection,
			detail: displayMessage,
			life: error.status === 401 ? 3000 : 5000,
		});

		return appError;
	}

	/**
	 * Maneja errores de cliente (JavaScript errors)
	 */
	handleClientError(error: Error, context?: Record<string, unknown>): AppError {
		logger.error('[ErrorHandler] Client error:', error);

		const appError = this.createError(
			UI_CLIENT_ERROR_MESSAGE,
			'error',
			'client',
			{ originalError: error, context },
		);

		this.showNotification({
			severity: 'error',
			summary: UI_ERROR_SUMMARIES.application,
			detail: appError.message,
			life: 5000,
		});

		return appError;
	}

	/**
	 * Maneja errores de validacion
	 */
	handleValidationError(message: string, context?: Record<string, unknown>): AppError {
		const appError = this.createError(message, 'warn', 'validation', { context });

		this.showNotification({
			severity: 'warn',
			summary: UI_ERROR_SUMMARIES.validation,
			detail: message,
			life: 4000,
		});

		return appError;
	}

	/**
	 * Muestra notificacion informativa
	 */
	showInfo(summary: string, detail: string, life = 3000): void {
		this.showNotification({ severity: 'info', summary, detail, life });
	}

	/**
	 * Muestra notificacion de exito
	 */
	showSuccess(summary: string, detail: string, life = 3000): void {
		this.showNotification({ severity: 'success', summary, detail, life });
	}

	/**
	 * Muestra notificacion de advertencia
	 */
	showWarning(summary: string, detail: string, life = 4000): void {
		this.showNotification({ severity: 'warn', summary, detail, life });
	}

	/**
	 * Muestra notificacion de error
	 */
	showError(summary: string, detail: string, life = 5000): void {
		this.showNotification({ severity: 'error', summary, detail, life });
	}

	/**
	 * Limpia la notificacion actual
	 */
	clearNotification(): void {
		this._currentNotification.set(null);
	}

	/**
	 * Limpia los errores
	 */
	clearErrors(): void {
		this._errors.set([]);
	}

	// Metodos privados
	private createError(
		message: string,
		severity: ErrorSeverity,
		source: ErrorSource,
		options: Partial<AppError> = {},
	): AppError {
		const error: AppError = {
			id: crypto.randomUUID(),
			message,
			severity,
			source,
			timestamp: new Date(),
			...options,
		};

		this._errors.update((errors) => [...errors.slice(-49), error]); // Max 50 errores
		logger.error(`[ErrorHandler] ${source}:`, message, options.context);

		return error;
	}

	private showNotification(notification: ErrorNotification): void {
		this._currentNotification.set(notification);
	}

	private extractHttpDetails(error: HttpErrorResponse, method?: string): HttpErrorDetails {
		return {
			url: error.url ?? 'unknown',
			method: method ?? 'unknown',
			statusCode: error.status,
			statusText: error.statusText,
			message: error.message,
			body: error.error,
		};
	}

	private getHttpErrorMessage(error: HttpErrorResponse): string {
		// Primero intentar obtener mensaje del backend
		if (error.error?.mensaje) {
			return error.error.mensaje;
		}
		if (error.error?.message) {
			return error.error.message;
		}

		// Usar mensaje predefinido por codigo
		return (
			HTTP_ERROR_MESSAGES[error.status] ??
			`Error ${error.status}: ${error.statusText || UI_GENERIC_MESSAGES.unknownError}`
		);
	}
}
// #endregion
