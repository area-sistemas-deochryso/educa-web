import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom, timeout } from 'rxjs';
import { WalEntry, WAL_DEFAULTS } from './models';

/**
 * Build HTTP request for a WAL entry with idempotency header.
 * X-Skip-Error-Toast prevents the error interceptor from showing a duplicate toast —
 * WAL manages its own error lifecycle (retries first, then facade shows the final toast).
 */
function buildRequest(http: HttpClient, entry: WalEntry): Observable<unknown> {
	const headers = new HttpHeaders()
		.set(WAL_DEFAULTS.IDEMPOTENCY_HEADER, entry.id)
		.set('X-Skip-Error-Toast', '1');
	switch (entry.method) {
		case 'POST':
			return http.post(entry.endpoint, entry.payload, { headers });
		case 'PUT':
			return http.put(entry.endpoint, entry.payload, { headers });
		case 'PATCH':
			return http.patch(entry.endpoint, entry.payload, { headers });
		case 'DELETE':
			return http.delete(entry.endpoint, { headers });
	}
}

/**
 * Send the HTTP request for a WAL entry and return a promise.
 * Always uses raw HttpClient with X-Idempotency-Key header (entry.id).
 * Applies a hard timeout to prevent hanging on slow/dead networks.
 */
export function sendWalEntryRequest(http: HttpClient, entry: WalEntry): Promise<unknown> {
	return firstValueFrom(buildRequest(http, entry).pipe(
		timeout(WAL_DEFAULTS.HTTP_TIMEOUT_MS),
	));
}
