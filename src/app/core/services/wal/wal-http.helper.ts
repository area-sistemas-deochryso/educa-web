import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { WalEntry, WAL_DEFAULTS } from './models';

/**
 * Build HTTP request for a WAL entry with idempotency header.
 */
function buildRequest(http: HttpClient, entry: WalEntry): Observable<unknown> {
	const headers = new HttpHeaders().set(WAL_DEFAULTS.IDEMPOTENCY_HEADER, entry.id);
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
 */
export function sendWalEntryRequest(http: HttpClient, entry: WalEntry): Promise<unknown> {
	return firstValueFrom(buildRequest(http, entry));
}
