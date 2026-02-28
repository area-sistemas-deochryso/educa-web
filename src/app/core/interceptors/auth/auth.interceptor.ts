import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Auth interceptor — now a no-op.
 * The HttpOnly cookie is sent automatically by the browser.
 * The credentialsInterceptor ensures withCredentials: true.
 *
 * Kept as placeholder during transition. Remove after full migration.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
	return next(req);
};
