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
import { Router } from '@angular/router';

import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from '@config/environment';
import { logger } from '@core/helpers';
import {
	UI_CLIENT_ERROR_MESSAGE,
	UI_ERROR_CODES,
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

	private readonly http = inject(HttpClient);
	private readonly router = inject(Router);

	// Estado con Signals
	private readonly _errors = signal<AppError[]>([]);
	private _reportCount = 0;
	private _reportResetTimer: ReturnType<typeof setTimeout> | null = null;
	private static readonly MAX_REPORTS_PER_MINUTE = 5;
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

		// Report server errors to backend for observability
		if (error.status >= 500) {
			this.reportToBackend(`HTTP ${error.status}: ${error.url}`, undefined, context);
		}

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

		this.reportToBackend(error.message, error.stack, context);

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

	// #region Metodos privados

	/** Recent notifications for dedup (key → timestamp). */
	private readonly _recentNotifications = new Map<string, number>();
	private static readonly NOTIFICATION_DEDUP_MS = 5_000;

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
		// Dedup por detail solamente (ignorar severity).
		// Cuando el interceptor y el facade resuelven el mismo errorCode,
		// ambos producen el mismo detail pero pueden diferir en severity.
		const key = notification.detail;
		const now = Date.now();
		const last = this._recentNotifications.get(key);

		if (last && now - last < ErrorHandlerService.NOTIFICATION_DEDUP_MS) {
			return;
		}

		this._recentNotifications.set(key, now);
		this._currentNotification.set(notification);

		// Cleanup old entries to prevent memory leak
		if (this._recentNotifications.size > 20) {
			for (const [k, ts] of this._recentNotifications) {
				if (now - ts > ErrorHandlerService.NOTIFICATION_DEDUP_MS) {
					this._recentNotifications.delete(k);
				}
			}
		}
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

	/** Fire-and-forget: sends critical errors to backend for observability. */
	private reportToBackend(message: string, stack?: string, context?: Record<string, unknown>): void {
		if (this._reportCount >= ErrorHandlerService.MAX_REPORTS_PER_MINUTE) return;
		this._reportCount++;

		if (!this._reportResetTimer) {
			this._reportResetTimer = setTimeout(() => {
				this._reportCount = 0;
				this._reportResetTimer = null;
			}, 60_000);
		}

		const headers = new HttpHeaders({ 'X-Skip-Error-Toast': 'true' });
		const body = {
			message,
			stack: stack?.substring(0, 2000),
			route: this.router.url,
			correlationId: (context?.['requestId'] as string) ?? null,
			timestamp: new Date().toISOString(),
		};

		this.http
			.post(`${environment.apiUrl}/api/sistema/client-errors`, body, { headers })
			.subscribe({ error: () => {} });
	}

	private getHttpErrorMessage(error: HttpErrorResponse): string {
		// 1. Resolver por errorCode del backend (contrato estable)
		const errorCode = error.error?.errorCode as string | undefined;
		if (errorCode && UI_ERROR_CODES[errorCode]) {
			return UI_ERROR_CODES[errorCode];
		}

		// 2. Fallback: mensaje directo del backend
		if (error.error?.message) {
			return error.error.message;
		}

		// 3. Fallback: mensaje predefinido por HTTP status
		return (
			HTTP_ERROR_MESSAGES[error.status] ??
			`Error ${error.status}: ${error.statusText || UI_GENERIC_MESSAGES.unknownError}`
		);
	}
}
// #endregion
