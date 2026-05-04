import { Injectable } from '@angular/core';
import { logger } from '@core/helpers';
import { WalEntry, WalEntryStatus, WalMode } from '../models';
import { WalStorageStrategy } from './wal-storage.strategy';

/**
 * Hard cap on entries kept in memory. Beyond this, the oldest entry by
 * insertion order is evicted with a `logger.error` so the operator can spot
 * cascade failures. The M2 banner already alerts the user that we're in
 * `ephemeral` mode; the cap is a guardrail to avoid OOM on long offline
 * sessions.
 */
export const WAL_MEMORY_CAP = 500;

/**
 * Ephemeral storage backed by an in-memory `Map`. Used as fallback when
 * IndexedDB is unavailable (private browsing, quota full, init timeout).
 *
 * Guarantees idempotent contract with {@link WalStorageIndexedDbStrategy}:
 * same `add → get → update → delete` semantics, FIFO ordering on
 * `getByStatus`, and `count` matches expected values.
 *
 * Entries are lost on reload — that's the contract of `ephemeral` mode.
 */
@Injectable({ providedIn: 'root' })
export class WalStorageMemoryStrategy implements WalStorageStrategy {
	readonly mode: WalMode = 'ephemeral';

	private readonly entries = new Map<string, WalEntry>();

	init(): Promise<boolean> {
		return Promise.resolve(true);
	}

	async put(entry: WalEntry): Promise<void> {
		// Evict oldest if cap reached and this would be a NEW entry.
		// Updates to existing keys never overflow.
		if (!this.entries.has(entry.id) && this.entries.size >= WAL_MEMORY_CAP) {
			const oldestKey = this.entries.keys().next().value;
			if (oldestKey !== undefined) {
				this.entries.delete(oldestKey);
				logger.error(
					`[WAL-DB] In-memory cap (${WAL_MEMORY_CAP}) reached — evicted oldest entry ${oldestKey}`,
				);
			}
		}
		this.entries.set(entry.id, entry);
	}

	async delete(id: string): Promise<void> {
		this.entries.delete(id);
	}

	async deleteCommittedOlderThan(timestamp: number): Promise<number> {
		let deleted = 0;
		for (const [id, entry] of this.entries) {
			if (
				entry.status === 'COMMITTED' &&
				entry.committedAt !== undefined &&
				entry.committedAt < timestamp
			) {
				this.entries.delete(id);
				deleted++;
			}
		}
		return deleted;
	}

	async purgeByResourceType(resourceType: string): Promise<number> {
		let deleted = 0;
		for (const [id, entry] of this.entries) {
			if (entry.resourceType === resourceType) {
				this.entries.delete(id);
				deleted++;
			}
		}
		return deleted;
	}

	async clear(): Promise<void> {
		this.entries.clear();
	}

	async get(id: string): Promise<WalEntry | undefined> {
		return this.entries.get(id);
	}

	async getByStatus(status: WalEntryStatus): Promise<WalEntry[]> {
		const out: WalEntry[] = [];
		for (const entry of this.entries.values()) {
			if (entry.status === status) out.push(entry);
		}
		out.sort((a, b) => a.timestamp - b.timestamp);
		return out;
	}

	async count(status?: WalEntryStatus): Promise<number> {
		if (!status) return this.entries.size;
		let n = 0;
		for (const entry of this.entries.values()) {
			if (entry.status === status) n++;
		}
		return n;
	}

	async hasActiveByResourceType(resourceType: string): Promise<boolean> {
		for (const entry of this.entries.values()) {
			if (
				entry.resourceType === resourceType &&
				(entry.status === 'PENDING' || entry.status === 'IN_FLIGHT')
			) {
				return true;
			}
		}
		return false;
	}

	async getAll(): Promise<WalEntry[]> {
		return Array.from(this.entries.values());
	}
}
