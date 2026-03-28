import { Injectable, inject } from '@angular/core';
import { logger } from '@core/helpers';
import { SwService } from '@features/intranet/services/sw/sw.service';
import { WalEntry, WAL_CACHE_MAP } from './models';

/**
 * Handles SW cache invalidation after WAL entry commits or failures.
 * Extracted from WalSyncEngine to isolate cache concerns.
 */
@Injectable({ providedIn: 'root' })
export class WalCacheInvalidator {
	private sw = inject(SwService);

	/**
	 * Invalidate SW cache patterns associated with a WAL entry's resourceType.
	 * Called after commit (so refetch hits network) and after permanent failure
	 * (so rollback doesn't leave stale cache).
	 *
	 * Uses WAL_CACHE_MAP for explicit mappings. Falls back to auto-extraction
	 * from the entry's endpoint URL for unmapped resource types.
	 */
	async invalidateForEntry(entry: WalEntry): Promise<void> {
		const patterns =
			WAL_CACHE_MAP[entry.resourceType] ??
			this.extractPatternsFromEndpoint(entry.endpoint);

		await this.invalidatePatterns(patterns, entry.resourceType);
	}

	/**
	 * Invalidate cache for a cross-tab commit event.
	 * Follower tabs call this so the next GET brings fresh data from the server.
	 */
	async invalidateForCrossTab(
		resourceType: string,
		entryId: string,
	): Promise<void> {
		const patterns = WAL_CACHE_MAP[resourceType] ?? [
			`/api/${resourceType}`,
		];

		const total = await this.invalidatePatterns(patterns, resourceType);
		if (total > 0) {
			logger.log(
				`[WAL-Sync] Cross-tab cache invalidated for ${resourceType}: ${total} entries (entry ${entryId.slice(0, 8)})`,
			);
		}
	}

	/**
	 * Auto-extract cache invalidation pattern from an endpoint URL.
	 * Extracts the base API path (e.g. '/api/Usuarios' from 'https://host/api/Usuarios/123').
	 * Used as fallback when resourceType is not in WAL_CACHE_MAP.
	 */
	private extractPatternsFromEndpoint(endpoint: string): string[] {
		try {
			const url = new URL(endpoint, 'http://localhost');
			const match = url.pathname.match(/^(\/api\/[^/]+)/);
			if (match) return [match[1]];
		} catch {
			// Malformed URL — skip
		}
		return [];
	}

	/**
	 * Invalidate a list of cache patterns and log the result.
	 * Returns total entries invalidated.
	 */
	private async invalidatePatterns(
		patterns: string[],
		resourceType: string,
	): Promise<number> {
		if (!patterns.length) return 0;

		try {
			const results = await Promise.all(
				patterns.map((p) => this.sw.invalidateCacheByPattern(p)),
			);
			const total = results.reduce((sum, n) => sum + n, 0);
			if (total > 0) {
				logger.log(
					`[WAL-Sync] Cache invalidated for ${resourceType}: ${total} entries`,
				);
			}
			return total;
		} catch (e) {
			// Non-critical: cache will expire via TTL anyway
			logger.warn('[WAL-Sync] Cache invalidation failed:', e);
			return 0;
		}
	}
}
