import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
// eslint-disable-next-line layer-enforcement/imports-error -- eager code: barrel import would pull WalService/SyncEngine (~16 kB) into initial bundle, see eager-no-core-services-barrel
import { WalClockService } from '@core/services/wal/wal-clock.service';

/**
 * Reads the `Date` header from API responses to detect clock skew.
 * Lightweight: only processes responses that include the header.
 */
export const clockSyncInterceptor: HttpInterceptorFn = (req, next) => {
	if (!req.url.includes('/api/')) {
		return next(req);
	}

	const clockService = inject(WalClockService);

	return next(req).pipe(
		tap((event) => {
			if (event instanceof HttpResponse) {
				const dateHeader = event.headers.get('Date');
				if (dateHeader) {
					clockService.recordServerTime(dateHeader);
				}
			}
		}),
	);
};
