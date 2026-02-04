import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { ErrorHandlerService } from '@core/services/error';
import { inject } from '@angular/core';
import { logger } from '@core/helpers';

// * Centralizes HTTP error handling and reporting.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
	const errorHandler = inject(ErrorHandlerService);

	return next(req).pipe(
		catchError((error: HttpErrorResponse) => {
			// No procesar errores de login/verificar (se manejan localmente en el formulario).
			if (req.url.includes('/login') || req.url.includes('/verificar')) {
				return throwError(() => error);
			}
			logger.error('[ErrorInterceptor] HTTP Error:', error.status, req.url);

			// Manejar error centralizado
			errorHandler.handleHttpError(error, {
				url: req.url,
				method: req.method,
				body: req.body,
			});

			// Re-lanzar para que los callers puedan reaccionar si lo necesitan.
			return throwError(() => error);
		}),
	);
};
