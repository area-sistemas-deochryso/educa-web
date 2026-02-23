// #region Imports
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';
// #endregion

// #region Implementation

/**
 * Desenvuelve respuestas ApiResponse<T> del backend transparentemente.
 *
 * - Si body tiene { success: true, data: T } → retorna T
 * - Si data es null pero message existe → retorna { mensaje: message } (backward compat)
 * - Si no es ApiResponse (file downloads, etc.) → pass through sin cambios
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
