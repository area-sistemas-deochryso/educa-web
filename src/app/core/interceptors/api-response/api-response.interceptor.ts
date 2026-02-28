// #region Imports
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';
// #endregion

// #region Implementation

/**
 * Unwrap backend ApiResponse<T> envelopes transparently.
 *
 * Behavior:
 * - If body has { success: true, data: T } return T.
 * - If data is null and message exists, return { mensaje: message }.
 * - If body is not ApiResponse, pass through unchanged.
 *
 * @example
 * providers: [{ provide: HTTP_INTERCEPTORS, useValue: apiResponseInterceptor, multi: true }]
 */
export const apiResponseInterceptor: HttpInterceptorFn = (req, next) => {
	return next(req).pipe(
		map((event) => {
			if (!(event instanceof HttpResponse) || event.body == null) {
				return event;
			}

			const body = event.body;

			if (typeof body !== 'object' || !('success' in body)) {
				return event;
			}

			const apiResponse = body as { success: boolean; data?: unknown; message?: string };

			if (!apiResponse.success) {
				return event;
			}

			if (apiResponse.data !== null && apiResponse.data !== undefined) {
				return event.clone({ body: apiResponse.data });
			}

			if (apiResponse.message) {
				return event.clone({ body: { mensaje: apiResponse.message } });
			}

			return event.clone({ body: null });
		}),
	);
};
// #endregion
