import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http'
import { inject } from '@angular/core'
import { catchError, throwError } from 'rxjs'
import { ErrorHandlerService } from '@core/services/error'
import { logger } from '@core/helpers'

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
	const errorHandler = inject(ErrorHandlerService)

	return next(req).pipe(
		catchError((error: HttpErrorResponse) => {
			logger.error('[ErrorInterceptor] HTTP Error:', error.status, req.url)

			// No procesar errores de login (se manejan localmente)
			if (req.url.includes('/login') || req.url.includes('/verificar')) {
				return throwError(() => error)
			}

			// Manejar error centralizado
			errorHandler.handleHttpError(error, {
				url: req.url,
				method: req.method,
				body: req.body,
			})

			return throwError(() => error)
		})
	)
}
