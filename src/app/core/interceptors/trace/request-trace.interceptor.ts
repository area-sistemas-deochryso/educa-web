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
 * Adds X-Request-Id to ALL requests (prod + dev) for backend correlation.
 * Records timing and details only in dev mode.
 */
// #endregion
// #region Implementation

function generateRequestId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `req_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export const requestTraceInterceptor: HttpInterceptorFn = (req, next) => {
	const trace = inject(RequestTraceFacade);

	// Always send X-Request-Id for backend correlation (prod + dev)
	const requestId = generateRequestId();
	const tracedReq = req.clone({
		setHeaders: { 'X-Request-Id': requestId },
	});

	// Recording/timing only in dev mode
	if (!trace.isEnabled) {
		return next(tracedReq);
	}

	const startedAtPerf = performance.now();
	const startedAt = new Date();

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
