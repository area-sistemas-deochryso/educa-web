import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, switchMap, take, throwError } from 'rxjs';

import { AuthApiService } from '@core/services/auth/auth-api.service';
import { logger } from '@core/helpers';

// #region Shared refresh state

// Module-level state shared across concurrent requests.
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<boolean>(false);

/** URLs that should never trigger a refresh attempt. */
const SKIP_REFRESH_URLS = ['/api/Auth/login', '/api/Auth/refresh', '/api/Auth/logout'];

// #endregion

// #region Implementation

/**
 * Intercepts 401 responses and attempts a silent token refresh.
 *
 * Flow:
 * 1. Request fails with 401
 * 2. If no refresh in progress → call POST /api/Auth/refresh
 * 3. On success → retry the original request (new cookie is set by server)
 * 4. On failure → propagate 401 (errorInterceptor handles redirect)
 * 5. Concurrent 401s queue behind the single refresh attempt
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
	const authApi = inject(AuthApiService);

	return next(req).pipe(
		catchError((error: HttpErrorResponse) => {
			if (error.status !== 401 || shouldSkipRefresh(req)) {
				return throwError(() => error);
			}

			if (!isRefreshing) {
				return startRefresh(authApi, req, next);
			}

			// Another request is already refreshing — wait for it
			return waitForRefresh(req, next);
		}),
	);
};

// #endregion

// #region Helpers

function shouldSkipRefresh(req: HttpRequest<unknown>): boolean {
	return SKIP_REFRESH_URLS.some((url) => req.url.includes(url));
}

/**
 * Initiates the refresh and retries the original request on success.
 */
function startRefresh(
	authApi: AuthApiService,
	req: HttpRequest<unknown>,
	next: HttpHandlerFn,
): Observable<any> {
	isRefreshing = true;
	refreshSubject.next(false);

	return authApi.refresh().pipe(
		switchMap(() => {
			isRefreshing = false;
			refreshSubject.next(true);
			// Retry original request — browser sends the new cookie automatically
			return next(req);
		}),
		catchError((refreshError) => {
			isRefreshing = false;
			refreshSubject.next(true);
			logger.warn('[AuthInterceptor] Refresh failed, session expired');
			return throwError(() => refreshError);
		}),
	);
}

/**
 * Queues behind an in-progress refresh, then retries the original request.
 */
function waitForRefresh(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<any> {
	return refreshSubject.pipe(
		filter((refreshed) => refreshed),
		take(1),
		switchMap(() => next(req)),
	);
}

// #endregion
