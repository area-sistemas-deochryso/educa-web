import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { logger } from '@app/core/helpers';
import { StorageService } from '@app/core/services';

// * Adds bearer token to protected requests (skips login).
export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const storage = inject(StorageService);
	const token = storage.getToken();

	logger.log('[Interceptor] URL:', req.url);
	logger.log('[Interceptor] Token exists:', !!token);

	// Evita adjuntar token a login para no enviar credenciales viejas.
	// Si hay token y la petición NO es al endpoint de login, añadir el header Authorization
	if (token && !req.url.includes('/login')) {
		logger.log('[Interceptor] Adding Authorization header');
		const clonedRequest = req.clone({
			setHeaders: {
				Authorization: `Bearer ${token}`,
			},
		});
		return next(clonedRequest);
	}

	return next(req);
};
