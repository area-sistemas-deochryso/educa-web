// #region Imports
import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, Subject, catchError, filter, switchMap, take, throwError, timeout } from 'rxjs';

import { logger } from '@core/helpers';
import { AuthApiService } from '@core/services/auth/auth-api.service';
import { ErrorHandlerService } from '@core/services/error';
import { ErrorReporterService } from '@core/services/error/error-reporter.service';
import { SessionActivityService } from '@core/services/session';

// * Centralizes HTTP error handling and reporting.

// Refresh lock: prevents multiple concurrent refresh attempts from 401s.
let isRefreshing = false;
let refreshResult$ = new Subject<boolean>();

/** URLs that should never trigger a refresh-on-401 (prevents infinite loops). */
const SKIP_REFRESH_URLS = ['/login', '/verificar', '/logout', '/refresh'];

/** Max time (ms) to wait for a pending refresh before giving up. */
const REFRESH_WAIT_TIMEOUT = 10_000;

// #endregion
// #region Implementation
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
	const errorHandler = inject(ErrorHandlerService);
	const errorReporter = inject(ErrorReporterService);
	const sessionActivity = inject(SessionActivityService);
	const authApi = inject(AuthApiService);
	const requestId = req.headers.get('X-Request-Id') ?? undefined;

	return next(req).pipe(
		catchError((error: HttpErrorResponse) => {
			// Skip URLs handled locally (login form, token verification, refresh).
			// BUT still report 500+ errors silently — those are backend bugs, not user errors.
			if (SKIP_REFRESH_URLS.some((url) => req.url.includes(url))) {
				if (error.status >= 500 || error.status === 0) {
					errorReporter.reportHttpError(error.status, req.url, req.method, undefined, requestId);
				}
				return throwError(() => error);
			}

			// 401 — access token expired. Attempt refresh before forcing logout.
			// Must run BEFORE X-Skip-Error-Toast check: silent requests still need token refresh.
			if (error.status === 401) {
				return handle401(req, next, authApi, sessionActivity);
			}

			// Skip error toast for requests that handle their own errors locally.
			// Still report 500+ silently for trazability.
			if (req.headers.has('X-Skip-Error-Toast')) {
				if (error.status >= 500 || error.status === 0) {
					errorReporter.reportHttpError(error.status, req.url, req.method, undefined, requestId);
				}
				return throwError(() => error);
			}

			logger.error('[ErrorInterceptor] HTTP Error:', error.status, req.url);

			// Extract traceId and errorCode from response body
			const errorBody = error.error as Record<string, unknown> | null;
			const traceId =
				error.headers?.get('X-Correlation-Id') ??
				errorBody?.['traceId'] ??
				undefined;
			const errorCode = (errorBody?.['errorCode'] as string) ?? undefined;

			// * 409 Conflict: let handleHttpError resolve via errorCode (CONCURRENCY_CONFLICT, etc.)
			// No special-case here — the generic flow uses UI_ERROR_CODES for the message,
			// which keeps it aligned with facade error policies (dedup relies on same detail).

			// * 429 Too Many Requests: fully suppress toast — RateLimitBanner handles UX.
			if (error.status === 429) {
				return throwError(() => error);
			}

			errorHandler.handleHttpError(error, {
				url: req.url,
				method: req.method,
				body: req.body,
				requestId,
				traceId,
				errorCode,
			});

			// Re-lanzar para que los callers puedan reaccionar si lo necesitan.
			return throwError(() => error);
		}),
	);
};

/**
 * Handle 401 by attempting a single token refresh, then retrying the original request.
 * Concurrent 401s queue behind the same refresh attempt — only one refresh runs at a time.
 * Auth is cookie-based so retry doesn't need to modify headers; the browser sends the new cookie.
 */
function handle401(
	req: HttpRequest<unknown>,
	next: HttpHandlerFn,
	authApi: AuthApiService,
	sessionActivity: SessionActivityService,
): Observable<HttpEvent<unknown>> {
	if (isRefreshing) {
		// Another request already triggered a refresh — wait for it (with timeout to avoid hanging)
		return refreshResult$.pipe(
			filter((success) => success !== undefined),
			take(1),
			timeout(REFRESH_WAIT_TIMEOUT),
			switchMap((success): Observable<HttpEvent<unknown>> => {
				if (success) {
					return next(req);
				}
				return throwError(() => new HttpErrorResponse({ status: 401 }));
			}),
			catchError(() => throwError(() => new HttpErrorResponse({ status: 401 }))),
		);
	}

	// First 401 — trigger the refresh
	isRefreshing = true;
	refreshResult$ = new Subject<boolean>();

	return authApi.refresh().pipe(
		switchMap(() => {
			isRefreshing = false;
			refreshResult$.next(true);
			refreshResult$.complete();
			logger.log('[ErrorInterceptor] 401 recovered via refresh — retrying', req.url);
			return next(req);
		}),
		catchError((refreshError) => {
			isRefreshing = false;
			refreshResult$.next(false);
			refreshResult$.complete();
			logger.warn('[ErrorInterceptor] 401 + refresh failed — forcing logout', req.url);
			sessionActivity.forceLogout();
			return throwError(() => refreshError);
		}),
	);
}
// #endregion
