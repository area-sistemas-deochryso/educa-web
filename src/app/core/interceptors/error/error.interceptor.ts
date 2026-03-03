// #region Imports
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { ErrorHandlerService } from '@core/services/error';
import { SessionActivityService } from '@core/services/session';
import { inject } from '@angular/core';
import { logger } from '@core/helpers';

// * Centralizes HTTP error handling and reporting.
// #endregion
// #region Implementation
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
	const errorHandler = inject(ErrorHandlerService);
	const sessionActivity = inject(SessionActivityService);
	const requestId = req.headers.get('X-Request-Id') ?? undefined;

	return next(req).pipe(
		catchError((error: HttpErrorResponse) => {
			// Skip URLs handled locally (login form, token verification).
			if (
				req.url.includes('/login') ||
				req.url.includes('/verificar') ||
				req.url.includes('/logout')
			) {
				return throwError(() => error);
			}

			// Skip requests that handle their own errors (e.g. optional API calls with catchError).
			if (req.headers.has('X-Skip-Error-Toast')) {
				return throwError(() => error);
			}

			// 401 — session expired or invalid. Full cleanup + redirect.
			if (error.status === 401) {
				logger.warn('[ErrorInterceptor] 401 — forcing logout', req.url);
				sessionActivity.forceLogout();
				return throwError(() => error);
			}

			logger.error('[ErrorInterceptor] HTTP Error:', error.status, req.url);

			// Extract traceId: header first (available even on 502/503), body fallback
			const traceId =
				error.headers?.get('X-Correlation-Id') ??
				(error.error as Record<string, unknown> | null)?.['traceId'] ??
				undefined;

			// * 409 Conflict: datos modificados por otro usuario (concurrencia optimista).
			if (error.status === 409) {
				errorHandler.showWarning(
					'Datos desactualizados',
					'Otro usuario modificó este registro. Recargue los datos e intente nuevamente.',
					6000,
				);
				return throwError(() => error);
			}

			errorHandler.handleHttpError(error, {
				url: req.url,
				method: req.method,
				body: req.body,
				requestId,
				traceId,
			});

			// Re-lanzar para que los callers puedan reaccionar si lo necesitan.
			return throwError(() => error);
		}),
	);
};
// #endregion
