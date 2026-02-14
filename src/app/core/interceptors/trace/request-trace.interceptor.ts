// #region Imports
import {
	HttpErrorResponse,
	HttpInterceptorFn,
	HttpResponse,
} from '@angular/common/http';
import { finalize, tap } from 'rxjs';

import { RequestTraceFacade } from '@core/services/trace';
import { inject } from '@angular/core';

/**
 * Adds X-Request-Id and records timing for HTTP requests (dev only).
 */
// #endregion
// #region Implementation
export const requestTraceInterceptor: HttpInterceptorFn = (req, next) => {
	const trace = inject(RequestTraceFacade);

	if (!trace.isEnabled) {
		return next(req);
	}

	const requestId = trace.newRequestId();
	const startedAtPerf = performance.now();
	const startedAt = new Date();

	const tracedReq = req.clone({
		setHeaders: { 'X-Request-Id': requestId },
	});

	let status: number | null = null;
	let ok = false;
	let errorPayload: unknown;

	return next(tracedReq).pipe(
		tap({
			next: (event) => {
				if (event instanceof HttpResponse) {
					status = event.status;
					ok = true;
				}
			},
			error: (error: unknown) => {
				if (error instanceof HttpErrorResponse) {
					status = error.status;
				}
				ok = false;
				errorPayload = error;
			},
		}),
		finalize(() => {
			const endedAt = new Date();
			const durationMs = Math.round((performance.now() - startedAtPerf) * 100) / 100;

			trace.record({
				id: trace.newRequestId(),
				requestId,
				method: tracedReq.method,
				url: tracedReq.urlWithParams,
				status,
				ok,
				durationMs,
				startedAt,
				endedAt,
				error: errorPayload,
			});
		}),
	);
};
// #endregion
