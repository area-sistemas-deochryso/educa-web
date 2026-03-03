import { Injectable, inject } from '@angular/core';
import { logger } from '@core/helpers';
import { WalDbService } from './wal-db.service';
import {
	WalEntry,
	WalEntryStatus,
	WalStats,
	WAL_DEFAULTS,
} from './models';

/**
 * Write-Ahead Log lifecycle management.
 *
 * Manages entries from PENDING to COMMITTED or FAILED.
 */
@Injectable({ providedIn: 'root' })
export class WalService {
	private db = inject(WalDbService);

	// #region Append

	/**
	 * Append a new WAL entry with PENDING status.
	 * The entry id is used as the X-Idempotency-Key header.
	 *
	 * @param config Entry configuration without id and timestamps.
	 * @returns Persisted WAL entry.
	 */
	async append(
		config: Omit<WalEntry, 'id' | 'timestamp' | 'status' | 'retries' | 'maxRetries'> & {
			maxRetries?: number;
		},
	): Promise<WalEntry> {
		const entry: WalEntry = {
			...config,
			id: crypto.randomUUID(),
			timestamp: Date.now(),
			status: 'PENDING',
			retries: 0,
			maxRetries: config.maxRetries ?? WAL_DEFAULTS.MAX_RETRIES,
		};

		await this.db.put(entry);
		logger.log(
			`[WAL] Appended: ${entry.operation} ${entry.resourceType}`,
			entry.id,
		);
		return entry;
	}

	// #endregion

	// #region Status Transitions
	/**
	 * Mark an entry as IN_FLIGHT.
	 *
	 * @param id Entry id.
	 */
	async markInFlight(id: string): Promise<void> {
		await this.updateStatus(id, 'IN_FLIGHT');
	}
	/**
	 * Mark an entry as COMMITTED and set committedAt.
	 *
	 * @param id Entry id.
	 */
	async markCommitted(id: string): Promise<void> {
		const entry = await this.db.get(id);
		if (!entry) return;

		entry.status = 'COMMITTED';
		entry.committedAt = Date.now();
		await this.db.put(entry);

		logger.log(
			`[WAL] Committed: ${entry.operation} ${entry.resourceType}`,
			id,
		);
	}

	/**
	 * Commit and immediately delete an entry.
	 * Avoids accumulating COMMITTED entries in IndexedDB.
	 *
	 * @param id Entry id.
	 */
	async commitAndClean(id: string): Promise<void> {
		const entry = await this.db.get(id);
		if (!entry) return;

		logger.log(
			`[WAL] Committed: ${entry.operation} ${entry.resourceType}`,
			id,
		);
		await this.db.delete(id);
	}
	/**
	 * Mark an entry as FAILED and store the error.
	 *
	 * @param id Entry id.
	 * @param error Error message.
	 */
	async markFailed(id: string, error: string): Promise<void> {
		const entry = await this.db.get(id);
		if (!entry) return;

		entry.status = 'FAILED';
		entry.failedAt = Date.now();
		entry.error = error;
		await this.db.put(entry);

		logger.error(
			`[WAL] Failed: ${entry.operation} ${entry.resourceType} - ${error}`,
			id,
		);
	}
	/**
	 * Mark an entry as CONFLICT after a 409 response.
	 *
	 * @param id Entry id.
	 */
	async markConflict(id: string): Promise<void> {
		const entry = await this.db.get(id);
		if (!entry) return;

		entry.status = 'CONFLICT';
		entry.error = 'Server returned 409 Conflict';
		await this.db.put(entry);

		logger.warn(
			`[WAL] Conflict: ${entry.operation} ${entry.resourceType}`,
			id,
		);
	}

	// #endregion

	// #region Retry Management

	/**
	 * Increment retry count and schedule next retry time.
	 *
	 * @param id Entry id.
	 * @returns Updated entry or null when not found.
	 */
	async incrementRetry(id: string): Promise<WalEntry | null> {
		const entry = await this.db.get(id);
		if (!entry) return null;

		entry.retries++;

		if (entry.retries >= entry.maxRetries) {
			entry.status = 'FAILED';
			entry.failedAt = Date.now();
			entry.error = `Max retries (${entry.maxRetries}) exceeded`;
			await this.db.put(entry);
			logger.error(`[WAL] Max retries exceeded for ${id}`);
			return entry;
		}

		const backoffMs = Math.min(
			WAL_DEFAULTS.BASE_BACKOFF_MS * Math.pow(2, entry.retries),
			WAL_DEFAULTS.MAX_BACKOFF_MS,
		);
		entry.status = 'PENDING';
		entry.nextRetryAt = Date.now() + backoffMs;
		await this.db.put(entry);

		logger.log(
			`[WAL] Retry ${entry.retries}/${entry.maxRetries} for ${id}, next in ${backoffMs}ms`,
		);
		return entry;
	}

	/**
	 * Manual retry for a FAILED entry (reset counters to PENDING).
	 *
	 * @param id Entry id.
	 */
	async retryEntry(id: string): Promise<void> {
		const entry = await this.db.get(id);
		if (!entry) return;

		entry.status = 'PENDING';
		entry.retries = 0;
		entry.error = undefined;
		entry.failedAt = undefined;
		entry.nextRetryAt = undefined;
		await this.db.put(entry);

		logger.log(`[WAL] Manual retry for ${id}`);
	}

	/**
	 * Discard a FAILED entry permanently.
	 *
	 * @param id Entry id.
	 */
	async discardEntry(id: string): Promise<void> {
		await this.db.delete(id);
		logger.log(`[WAL] Discarded entry ${id}`);
	}

	// #endregion

	// #region Queries
	/**
	 * Get PENDING entries ordered by timestamp.
	 */
	async getPendingEntries(): Promise<WalEntry[]> {
		return this.db.getPending();
	}
	/**
	 * Get FAILED entries.
	 */
	async getFailedEntries(): Promise<WalEntry[]> {
		return this.db.getFailed();
	}

	/**
	 * Get PENDING entries ready for retry.
	 */
	async getRetryableEntries(): Promise<WalEntry[]> {
		return this.db.getRetryable();
	}
	/**
	 * Get a WAL entry by id.
	 *
	 * @param id Entry id.
	 */
	async getEntry(id: string): Promise<WalEntry | undefined> {
		return this.db.get(id);
	}
	/**
	 * Get current WAL counts by status.
	 */
	async getStats(): Promise<WalStats> {
		const [pending, inFlight, failed, committed, conflict] = await Promise.all([
			this.db.count('PENDING'),
			this.db.count('IN_FLIGHT'),
			this.db.count('FAILED'),
			this.db.count('COMMITTED'),
			this.db.count('CONFLICT'),
		]);
		return { pending, inFlight, failed, committed, conflict };
	}

	// #endregion

	// #region Cleanup

	/**
	 * Delete COMMITTED entries older than the TTL.
	 *
	 * @returns Number of entries deleted.
	 */
	async cleanup(): Promise<number> {
		const cutoff = Date.now() - WAL_DEFAULTS.COMMITTED_TTL_MS;
		const deleted = await this.db.deleteCommittedOlderThan(cutoff);
		if (deleted > 0) {
			logger.log(`[WAL] Cleaned up ${deleted} committed entries`);
		}
		return deleted;
	}

	/**
	 * Reset IN_FLIGHT entries back to PENDING after restart.
	 *
	 * @returns Number of entries recovered.
	 */
	async recoverInFlight(): Promise<number> {
		const inFlight = await this.db.getByStatus('IN_FLIGHT');
		let recovered = 0;

		for (const entry of inFlight) {
			entry.status = 'PENDING';
			entry.nextRetryAt = undefined;
			await this.db.put(entry);
			recovered++;
		}

		if (recovered > 0) {
			logger.log(`[WAL] Recovered ${recovered} in-flight entries`);
		}
		return recovered;
	}

	// #endregion

	// #region Private Helpers
	/**
	 * Update status for a single entry.
	 *
	 * @param id Entry id.
	 * @param status New status.
	 */
	private async updateStatus(id: string, status: WalEntryStatus): Promise<void> {
		const entry = await this.db.get(id);
		if (!entry) return;

		entry.status = status;
		await this.db.put(entry);
	}

	// #endregion
}
