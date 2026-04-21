import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { finalize, mergeMap, take } from 'rxjs/operators';

// #region Configuration

/**
 * Max concurrent API requests. Excess requests se encolan (sin límite de cola)
 * hasta que se libere un slot.
 *
 * Rationale: proteger al BE de ráfagas locales de un solo cliente. NO sustituye
 * al rate limiter del servidor — cuando el BE devuelve 429, este interceptor
 * propaga el error tal cual al caller, sin inventar cooldowns globales.
 */
const MAX_CONCURRENT = 10;

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
 * Endpoints que bypassean la cola de concurrencia: trazabilidad y reportes
 * manuales del usuario. Deben poder ejecutarse incluso con la cola saturada
 * por otras operaciones — son canales de diagnóstico que no deben quedarse
 * sin cupo.
 */
function bypassConcurrencyQueue(req: HttpRequest<unknown>): boolean {
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

// #endregion

// #region Interceptor

/**
 * Cola de concurrencia del cliente para requests a `/api/`.
 *
 * - Limita requests concurrentes a MAX_CONCURRENT; excedentes esperan turno.
 * - NO sintetiza 429s. NO activa cooldowns globales. NO bloquea la app entera
 *   cuando el BE rechaza un endpoint.
 * - Un 429 del BE se propaga al caller tal cual; el feature que lo recibió
 *   decide cómo mostrarlo (toast, inline, reintento manual).
 */
export const rateLimitInterceptor: HttpInterceptorFn = (
	req: HttpRequest<unknown>,
	next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
	if (!isApiRequest(req) || bypassConcurrencyQueue(req)) {
		return next(req);
	}

	return acquireSlot().pipe(
		mergeMap(() => next(req).pipe(finalize(() => releaseSlot()))),
	);
};

// #endregion
