import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Auth interceptor — pass-through.
 *
 * Cookies are sent automatically via credentialsInterceptor.
 * When the JWT expires (3h), the server returns 401 and
 * errorInterceptor redirects to login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => next(req);
