// #region Imports
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { ErrorHandlerService } from '@core/services/error';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { logger } from '@core/helpers';

// * Centralizes HTTP error handling and reporting.
// #endregion
// #region Implementation
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
	const errorHandler = inject(ErrorHandlerService);
	const router = inject(Router);
	const requestId = req.headers.get('X-Request-Id') ?? undefined;

	return next(req).pipe(
		catchError((error: HttpErrorResponse) => {
			// No procesar errores de login/verificar (se manejan localmente en el formulario).
			if (req.url.includes('/login') || req.url.includes('/verificar')) {
				return throwError(() => error);
			}
			logger.error('[ErrorInterceptor] HTTP Error:', error.status, req.url);

			// Extract traceId: header first (available even on 502/503), body fallback
			const traceId =
				error.headers?.get('X-Correlation-Id') ??
				(error.error as Record<string, unknown> | null)?.['traceId'] ??
				undefined;

			errorHandler.handleHttpError(error, {
				url: req.url,
				method: req.method,
				body: req.body,
				requestId,
				traceId,
			});

			// Redirigir al login en 401 (concern de HTTP, no del error handler)
			if (error.status === 401) {
				setTimeout(() => router.navigate(['/intranet/login']), 2000);
			}

			// Re-lanzar para que los callers puedan reaccionar si lo necesitan.
			return throwError(() => error);
		}),
	);
};
// #endregion
