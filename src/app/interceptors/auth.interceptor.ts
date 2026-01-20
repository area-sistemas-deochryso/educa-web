import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'educa_token';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const token = localStorage.getItem(TOKEN_KEY);

	console.log('[Interceptor] URL:', req.url);
	console.log('[Interceptor] Token exists:', !!token);

	// Si hay token y la petición NO es al endpoint de login, añadir el header Authorization
	if (token && !req.url.includes('/login')) {
		console.log('[Interceptor] Adding Authorization header');
		const clonedRequest = req.clone({
			setHeaders: {
				Authorization: `Bearer ${token}`,
			},
		});
		return next(clonedRequest);
	}

	return next(req);
};
