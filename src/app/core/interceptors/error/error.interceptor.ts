import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { ErrorHandlerService } from '@core/services/error';
import { inject } from '@angular/core';
import { logger } from '@core/helpers';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
	const errorHandler = inject(ErrorHandlerService);

	return next(req).pipe(
		catchError((error: HttpErrorResponse) => {
			// No procesar errores de login (se manejan localmente)
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

			return throwError(() => error);
		}),
	);
};
