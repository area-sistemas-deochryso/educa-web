import {
	HttpErrorResponse,
	HttpEvent,
	HttpHandlerFn,
	HttpInterceptorFn,
	HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, finalize, mergeMap, take } from 'rxjs/operators';

import { logger } from '@core/helpers';
import { RateLimitService } from '@core/services/rate-limit/rate-limit.service';

// #region Configuration

/** Max concurrent API requests before queuing new ones. */
const MAX_CONCURRENT = 10;

/** Max requests queued; excess are rejected immediately. */
const MAX_QUEUE_SIZE = 30;

/** Default cooldown if Retry-After header is missing (seconds). */
const DEFAULT_COOLDOWN_SECONDS = 60;

// #endregion

// #region Concurrency state

let inFlight = 0;
const waitQueue: Subject<void>[] = [];

// #endregion

// #region Helpers

function isApiRequest(req: HttpRequest<unknown>): boolean {
	return req.url.includes('/api/');
}

/**
 * Endpoints que se excluyen del rate-limit global del cliente.
 * Un 429 en estos NO debe activar el cooldown que bloquea toda la app —
 * son funciones opcionales (reportes manuales, trazabilidad) que el usuario
 * puede reintentar más tarde sin afectar el resto de la intranet.
 */
function isExemptFromGlobalCooldown(req: HttpRequest<unknown>): boolean {
	return (
		req.url.includes('/api/sistema/reportes-usuario') ||
		req.url.includes('/api/sistema/errors')
	);
}

function acquireSlot(): Observable<void> {
	if (inFlight < MAX_CONCURRENT) {
		inFlight++;
		return new Observable<void>((subscriber) => {
			subscriber.next();
			subscriber.complete();
		});
	}

	if (waitQueue.length >= MAX_QUEUE_SIZE) {
		return throwError(() =>
			new HttpErrorResponse({
				status: 429,
				statusText: 'Client queue full',
				url: '',
			}),
		);
	}

	const slot$ = new Subject<void>();
	waitQueue.push(slot$);
	return slot$.pipe(take(1));
}

function releaseSlot(): void {
	inFlight--;

	if (waitQueue.length > 0 && inFlight < MAX_CONCURRENT) {
		inFlight++;
		const next = waitQueue.shift()!;
		next.next();
		next.complete();
	}
}

/**
 * Drain all queued requests with a 429 error (called when cooldown activates).
 */
function drainQueue(): void {
	while (waitQueue.length > 0) {
		const queued = waitQueue.shift()!;
		queued.error(
			new HttpErrorResponse({
				status: 429,
				statusText: 'Rate limit cooldown active',
				url: '',
			}),
		);
	}
}

/**
 * Parse Retry-After from header or response body.
 * Returns seconds to wait, or DEFAULT_COOLDOWN_SECONDS if unparseable.
 */
function parseRetryAfter(error: HttpErrorResponse): number {
	// Try header first (RFC 6585)
	const headerValue = error.headers?.get('Retry-After');
	if (headerValue) {
		const parsed = parseInt(headerValue, 10);
		if (!isNaN(parsed) && parsed > 0) return parsed;
	}

	// Try response body (our backend sends retryAfterSeconds)
	const body = error.error as Record<string, unknown> | null;
	if (body?.['retryAfterSeconds']) {
		const bodyValue = Number(body['retryAfterSeconds']);
		if (!isNaN(bodyValue) && bodyValue > 0) return bodyValue;
	}

	return DEFAULT_COOLDOWN_SECONDS;
}

// #endregion

// #region Interceptor

/**
 * Global rate-limit interceptor.
 *
 * - Blocks ALL API requests immediately when cooldown is active.
 * - Caps concurrent API requests to MAX_CONCURRENT; excess are queued.
 * - On first 429 from server: reads Retry-After, activates global cooldown,
 *   drains queued requests, and rejects the request.
 */
export const rateLimitInterceptor: HttpInterceptorFn = (
	req: HttpRequest<unknown>,
	next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
	if (!isApiRequest(req)) {
		return next(req);
	}

	// Endpoints opcionales (feedback, trazabilidad) no participan del throttling
	// global: no consumen slot, no disparan cooldown, no se bloquean si la app
	// está en cooldown. Un 429 aquí se maneja en el facade local.
	if (isExemptFromGlobalCooldown(req)) {
		return next(req);
	}

	const rateLimitService = inject(RateLimitService);

	// Block immediately if cooldown is active
	if (rateLimitService.isCoolingDown()) {
		return throwError(() =>
			new HttpErrorResponse({
				status: 429,
				statusText: 'Rate limit cooldown active',
				url: req.url,
			}),
		);
	}

	return acquireSlot().pipe(
		mergeMap(() =>
			next(req).pipe(
				catchError((error: HttpErrorResponse) => {
					if (error.status === 429) {
						const retryAfter = parseRetryAfter(error);
						logger.warn(
							`[RateLimitInterceptor] 429 on ${req.method} ${req.url} — cooldown ${retryAfter}s`,
						);

						// Activate global cooldown + drain pending requests
						rateLimitService.activateCooldown(retryAfter);
						drainQueue();
					}
					return throwError(() => error);
				}),
				finalize(() => releaseSlot()),
			),
		),
	);
};

// #endregion
