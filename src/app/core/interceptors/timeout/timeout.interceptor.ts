import { HttpInterceptorFn } from '@angular/common/http';
import { timeout } from 'rxjs/operators';

const DEFAULT_TIMEOUT_MS = 30_000;

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
	if (req.headers.has('X-No-Timeout')) {
		const cleaned = req.clone({ headers: req.headers.delete('X-No-Timeout') });
		return next(cleaned);
	}

	return next(req).pipe(timeout(DEFAULT_TIMEOUT_MS));
};
