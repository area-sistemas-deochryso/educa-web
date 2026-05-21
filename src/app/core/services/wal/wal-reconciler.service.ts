import { Injectable, inject } from '@angular/core';
import { logger } from '@core/helpers';
// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-50-F3a
import { SwService } from '@features/intranet/services/sw/sw.service';
import { WalEntry, WAL_CACHE_MAP } from './models';

/**
 * Reconciles orphaned WAL commits (M1).
 *
 * When the app reloads while an entry is `IN_FLIGHT`, the in-memory callbacks
 * are lost. The recovery flow re-processes the entry against the server, but
 * `onCommit` cannot fire — components mounted with the optimistic snapshot
 * never get notified.
 *
 * This service forces a refetch of the cached URLs that match the entry's
 * resourceType so the SWR pipeline emits `cacheUpdated$` and any subscribed
 * component refreshes against the server (INV-WAL-RES01).
 */
@Injectable({ providedIn: 'root' })
export class WalReconciler {
	private sw = inject(SwService);

	/**
	 * Trigger refetchByPattern for every cache pattern mapped to the entry's
	 * resourceType. Logs and returns silently when no patterns are mapped or
	 * the SW is not registered.
	 */
	async notifyOrphanedCommit(entry: WalEntry): Promise<void> {
		const patterns = WAL_CACHE_MAP[entry.resourceType] ?? [];
		if (patterns.length === 0) {
			logger.log(
				`[WAL-Reconcile] No cache patterns for ${entry.resourceType}, skipping refetch (entry ${entry.id.slice(0, 8)})`,
			);
			return;
		}

		try {
			const counts = await Promise.all(
				patterns.map((p) => this.sw.refetchByPattern(p)),
			);
			const total = counts.reduce((sum, n) => sum + n, 0);
			if (total > 0) {
				logger.log(
					`[WAL-Reconcile] Refetched ${total} URLs for ${entry.resourceType} (entry ${entry.id.slice(0, 8)})`,
				);
			}
		} catch (e) {
			// Non-critical: cache invalidation already happened upstream
			logger.warn('[WAL-Reconcile] refetch failed:', e);
		}
	}
}
