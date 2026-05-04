import { WalEntry, WalEntryStatus, WalMode } from '../models';

/**
 * Storage backend contract for the WAL.
 *
 * Two implementations exist (M3):
 * - {@link WalStorageIndexedDbStrategy}: persistent across reloads (default).
 * - {@link WalStorageMemoryStrategy}: ephemeral fallback when IndexedDB is
 *   unavailable (private browsing, quota full, permission denied, init timeout).
 *
 * The `mode` getter exposes which backend is active so the WAL facade can
 * propagate it to `WalStatusStore.setMode(...)` and the degraded banner.
 */
export interface WalStorageStrategy {
	/**
	 * Mode this strategy reports to {@link WalStatusStore}.
	 * - `persistent` for IndexedDB.
	 * - `ephemeral` for in-memory.
	 * - `frozen` reserved for future read-only modes.
	 */
	readonly mode: WalMode;

	/**
	 * Initialize the backend. Resolves `true` when ready for reads/writes.
	 * Resolves `false` when the backend is unavailable; the facade is
	 * expected to swap to a fallback in that case.
	 *
	 * Implementations MUST resolve within {@link WAL_STORAGE_INIT_TIMEOUT_MS}
	 * or be considered failed (the facade enforces the timeout).
	 */
	init(): Promise<boolean>;

	/**
	 * Persist or update a WAL entry.
	 * Rejects with `QuotaExceededError` so callers can fall back to direct HTTP.
	 */
	put(entry: WalEntry): Promise<void>;

	/** Delete an entry by id. */
	delete(id: string): Promise<void>;

	/** Delete COMMITTED entries older than a timestamp. Returns how many were deleted. */
	deleteCommittedOlderThan(timestamp: number): Promise<number>;

	/** Delete every entry that matches `resourceType`, regardless of status. */
	purgeByResourceType(resourceType: string): Promise<number>;

	/** Wipe all entries. */
	clear(): Promise<void>;

	/** Get a single entry by id, or `undefined` if missing. */
	get(id: string): Promise<WalEntry | undefined>;

	/** Get entries by status, ordered by timestamp ASC (FIFO). */
	getByStatus(status: WalEntryStatus): Promise<WalEntry[]>;

	/** Count entries by status (or all if status is undefined). */
	count(status?: WalEntryStatus): Promise<number>;

	/** True when at least one PENDING or IN_FLIGHT entry exists for the resource. */
	hasActiveByResourceType(resourceType: string): Promise<boolean>;

	/** Return every stored entry. */
	getAll(): Promise<WalEntry[]>;
}

/**
 * Maximum time the IndexedDB strategy is allowed to take during `init()`.
 * If exceeded, the facade swaps to the in-memory fallback (INV-WAL-RES10).
 */
export const WAL_STORAGE_INIT_TIMEOUT_MS = 5_000;
