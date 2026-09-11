// #region Imports
import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { logger } from '@core/helpers';
import { ConnectivityService } from '@core/services/connectivity';

// * P10 F2 (DEP-2): observa el resultado de cada request a /api/* y avisa al
// * ConnectivityService cuando detecta N fallos de red/5xx consecutivos, o
// * cuando ve una respuesta exitosa. No reemplaza a errorInterceptor — corre
// * en paralelo y siempre re-lanza el error sin modificarlo.
// #endregion

// #region Constants
/** Ventana deslizante para contar fallos consecutivos. */
const FAILURE_WINDOW_MS = 30_000;
/** Fallos consecutivos dentro de la ventana que fuerzan `offline`. */
const FAILURE_THRESHOLD = 3;
// #endregion

// #region Module state
// Estado a nivel de módulo (mismo patrón que `isRefreshing` en error.interceptor):
// el interceptor funcional se re-ejecuta por request, pero el contador de
// fallos consecutivos debe persistir entre requests.
let failureTimestamps: number[] = [];

export function resetConnectivityInterceptorState(): void {
	failureTimestamps = [];
}
// #endregion

// #region Helpers
function isConnectivityFailure(error: unknown): boolean {
	if (!(error instanceof HttpErrorResponse)) return false;
	return error.status === 0 || error.status >= 500;
}

function registerFailure(connectivity: ConnectivityService, url: string): void {
	const now = Date.now();
	failureTimestamps = failureTimestamps.filter((ts) => now - ts < FAILURE_WINDOW_MS);
	failureTimestamps.push(now);

	if (failureTimestamps.length >= FAILURE_THRESHOLD) {
		logger.warn('[ConnectivityInterceptor] 3 fallos consecutivos en 30s — forzando offline:', url);
		failureTimestamps = [];
		connectivity.reportForcedOffline();
	}
}

function registerSuccess(connectivity: ConnectivityService): void {
	failureTimestamps = [];
	connectivity.reportSuccess();
}
// #endregion

// #region Implementation
export const connectivityInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
	if (!req.url.includes('/api/')) {
		return next(req);
	}

	const connectivity = inject(ConnectivityService);

	return next(req).pipe(
		tap((event) => {
			// Cualquier HttpResponse completa (2xx o no) significa que el backend
			// respondió — el error 4xx, si lo hubo, ya se manejó en catchError de
			// abajo (nunca llega acá como HttpResponse). Este tap solo ve éxitos.
			if (event instanceof HttpResponse) {
				registerSuccess(connectivity);
			}
		}),
		catchError((error: HttpErrorResponse | Error) => {
			if (isConnectivityFailure(error)) {
				registerFailure(connectivity, req.url);
			} else {
				// 4xx u otro error no-conectividad: el backend respondió, resetea el contador.
				failureTimestamps = [];
				connectivity.reportSuccess();
			}
			return throwError(() => error);
		}),
	);
};
// #endregion
