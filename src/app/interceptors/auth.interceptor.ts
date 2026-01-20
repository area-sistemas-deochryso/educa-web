import { HttpInterceptorFn } from '@angular/common/http';
import { logger } from '@app/helpers';

const TOKEN_KEY = 'educa_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const token = localStorage.getItem(TOKEN_KEY);

	logger.log('[Interceptor] URL:', req.url);
	logger.log('[Interceptor] Token exists:', !!token);

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
