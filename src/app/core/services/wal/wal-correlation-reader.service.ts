import { Injectable, inject } from '@angular/core';

import { WalEntry } from './models';
import { WalDbService } from './wal-db.service';

/**
 * Read-only window into the WAL for diagnostics screens (Plan 41 F6, ADR-0009).
 *
 * `WalDbService` is a private implementation detail of the WAL; this exposes
 * only the lookup by correlation id, with no way to retry, clear or mutate.
 */
@Injectable({ providedIn: 'root' })
export class WalCorrelationReader {
	private readonly db = inject(WalDbService);

	getByCorrelationId(correlationId: string): Promise<WalEntry[]> {
		return this.db.getByCorrelationId(correlationId);
	}
}
