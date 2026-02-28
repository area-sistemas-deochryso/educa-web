import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Ensures all HTTP requests include credentials (cookies).
 * Required for HttpOnly cookie auth to work.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
	const cloned = req.clone({ withCredentials: true });
	return next(cloned);
};
