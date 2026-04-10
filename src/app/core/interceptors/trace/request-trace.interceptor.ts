// #region Imports
import {
	HttpErrorResponse,
	HttpInterceptorFn,
	HttpResponse,
} from '@angular/common/http';
import { finalize, tap } from 'rxjs';

import { ActivityTrackerService } from '@core/services/error/activity-tracker.service';
import { ErrorReporterService } from '@core/services/error/error-reporter.service';
import { RequestTraceFacade } from '@core/services/trace';
import { inject } from '@angular/core';

const SLOW_REQUEST_THRESHOLD_MS = 500;

/**
 * Adds X-Request-Id to ALL requests (prod + dev) for backend correlation.
 * Always feeds ActivityTracker with API breadcrumbs (prod + dev).
 * Records detailed timing only in dev mode via RequestTraceFacade.
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
	const activityTracker = inject(ActivityTrackerService);
	const errorReporter = inject(ErrorReporterService);

	// Always send X-Request-Id for backend correlation (prod + dev)
	const requestId = generateRequestId();
	const tracedReq = req.clone({
		setHeaders: { 'X-Request-Id': requestId },
	});

	const startedAtPerf = performance.now();

	// Skip breadcrumb tracking for the error reporter itself to avoid loops
	const isErrorEndpoint = tracedReq.url.includes('/api/sistema/errors');

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
			const durationMs = Math.round((performance.now() - startedAtPerf) * 100) / 100;

			// Always track API calls for error breadcrumbs (except error endpoint itself)
			if (!isErrorEndpoint && status !== null) {
				activityTracker.trackApiCall(tracedReq.method, tracedReq.url, status, durationMs);
			}

			// Request lento + fallido = problema de red (el SW puede haber ocultado el error)
			if (!isErrorEndpoint && !ok && durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
				errorReporter.reportHttpError(
					status ?? 0, tracedReq.url, tracedReq.method,
					'SLOW_REQUEST_FAILED', requestId,
				);
			}

			// Detailed recording only in dev mode
			if (trace.isEnabled) {
				const startedAt = new Date(Date.now() - durationMs);
				trace.record({
					id: trace.newRequestId(),
					requestId,
					method: tracedReq.method,
					url: tracedReq.urlWithParams,
					status,
					ok,
					durationMs,
					startedAt,
					endedAt: new Date(),
					error: errorPayload,
				});
			}
		}),
	);
};
// #endregion
