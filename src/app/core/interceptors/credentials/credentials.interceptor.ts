import { HttpInterceptorFn } from '@angular/common/http';

const PUBLIC_AUTH_PATHS = ['/api/Auth/login', '/api/Auth/refresh', '/api/Auth/mobile/login'];

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
	if (PUBLIC_AUTH_PATHS.some((p) => req.url.includes(p))) {
		return next(req);
	}

	const cloned = req.clone({ withCredentials: true });
	return next(cloned);
};
