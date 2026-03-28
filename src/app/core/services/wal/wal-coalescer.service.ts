import { Injectable, inject } from '@angular/core';
import { logger } from '@core/helpers';
import { environment } from '@config';
import { WalService } from './wal.service';
import { WalMetricsService } from './wal-metrics.service';
import { WalEntry } from './models';

/**
 * Merges duplicate PENDING UPDATE entries targeting the same resource.
 * Only the latest UPDATE per (resourceType + resourceId) is kept;
 * older entries are deleted from IndexedDB.
 *
 * CREATE, DELETE, TOGGLE, and CUSTOM operations are never coalesced.
 */
@Injectable({ providedIn: 'root' })
export class WalCoalescer {
	private wal = inject(WalService);
	private walMetrics = inject(WalMetricsService);

	/**
	 * Coalesce duplicate UPDATE entries and return the deduplicated list.
	 *
	 * @param entries List of WAL entries to process.
	 * @param cleanupCallback Optional callback to clean up in-memory state for discarded entries.
	 * @returns Deduplicated entries in chronological order.
	 */
	async coalesce(
		entries: WalEntry[],
		cleanupCallback?: (discardedId: string) => void,
	): Promise<WalEntry[]> {
		if (entries.length <= 1) return entries;

		// Group UPDATE entries by resource key
		const updatesByKey = new Map<string, WalEntry[]>();
		const nonUpdateEntries: WalEntry[] = [];

		for (const entry of entries) {
			if (entry.operation === 'UPDATE' && entry.resourceId != null) {
				const key = `${entry.resourceType}:${entry.resourceId}`;
				const group = updatesByKey.get(key);
				if (group) {
					group.push(entry);
				} else {
					updatesByKey.set(key, [entry]);
				}
			} else {
				nonUpdateEntries.push(entry);
			}
		}

		// For each group with 2+ entries, keep only the latest
		const survivingUpdates: WalEntry[] = [];
		let totalCoalesced = 0;

		for (const [, group] of updatesByKey) {
			if (group.length === 1) {
				survivingUpdates.push(group[0]);
				continue;
			}

			// Sort by timestamp DESC — latest first
			group.sort((a, b) => b.timestamp - a.timestamp);
			const latest = group[0];

			// Merge payload: shallow-merge all older payloads into the latest
			// This preserves fields from earlier edits that weren't overwritten
			if (latest.payload && typeof latest.payload === 'object') {
				for (let i = group.length - 1; i > 0; i--) {
					const older = group[i];
					if (older.payload && typeof older.payload === 'object') {
						latest.payload = {
							...(older.payload as Record<string, unknown>),
							...(latest.payload as Record<string, unknown>),
						};
					}
				}
				await this.wal.updateEntryPayload(latest.id, latest.payload);
			}

			survivingUpdates.push(latest);

			// Delete older entries
			for (let i = 1; i < group.length; i++) {
				const stale = group[i];
				await this.wal.discardEntry(stale.id);
				cleanupCallback?.(stale.id);
				totalCoalesced++;
			}
		}

		if (totalCoalesced > 0) {
			logger.log(
				`[WAL-Sync] Coalesced ${totalCoalesced} duplicate UPDATE entries`,
			);
			if (!environment.production) {
				this.walMetrics.recordCoalescence();
			}
		}

		// Return in original order (non-updates first, then surviving updates by timestamp)
		return [
			...nonUpdateEntries,
			...survivingUpdates.sort((a, b) => a.timestamp - b.timestamp),
		];
	}
}
