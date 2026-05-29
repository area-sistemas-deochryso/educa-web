import { HttpInterceptorFn } from '@angular/common/http';
import { timeout } from 'rxjs/operators';

const DEFAULT_TIMEOUT_MS = 30_000;

const DOWNLOAD_TIMEOUT_MS = 120_000;

export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
	if (req.headers.has('X-No-Timeout')) {
		const cleaned = req.clone({ headers: req.headers.delete('X-No-Timeout') });
		return next(cleaned);
	}

	const isDownload = req.responseType === 'blob';
	return next(req).pipe(timeout(isDownload ? DOWNLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS));
};
