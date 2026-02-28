import { Observable } from 'rxjs';

// #region Types
/** Supported WAL operations. */
export type WalOperation = 'CREATE' | 'UPDATE' | 'DELETE' | 'TOGGLE' | 'CUSTOM';
/** Supported HTTP methods for WAL entries. */
export type WalHttpMethod = 'POST' | 'PUT' | 'DELETE' | 'PATCH';
/** WAL entry lifecycle status. */
export type WalEntryStatus =
	| 'PENDING'
	| 'IN_FLIGHT'
	| 'COMMITTED'
	| 'FAILED'
	| 'CONFLICT';
// #endregion

// #region WAL Entry (persisted in IndexedDB)
/**
 * WAL entry persisted in IndexedDB.
 */
export interface WalEntry {
	/** UUID - also used as X-Idempotency-Key header */
	id: string;
	timestamp: number;
	operation: WalOperation;
	/** Domain resource: 'usuarios', 'horarios', etc. */
	resourceType: string;
	/** For UPDATE/DELETE/TOGGLE - the specific resource ID */
	resourceId?: number | string;
	/** Full API endpoint URL */
	endpoint: string;
	method: WalHttpMethod;
	/** Request body (must be JSON-serializable) */
	payload: unknown;
	status: WalEntryStatus;
	/** Current retry count */
	retries: number;
	/** Maximum retries before marking FAILED (default: 5) */
	maxRetries: number;
	/** Last error message */
	error?: string;
	/** Timestamp when server confirmed */
	committedAt?: number;
	/** Timestamp when permanently failed */
	failedAt?: number;
	/** Next retry timestamp (exponential backoff) */
	nextRetryAt?: number;
}
// #endregion

// #region Mutation Config (used by facades)
/**
 * Optimistic UI handlers for WAL mutations.
 */
export interface WalOptimisticConfig {
	/** Apply optimistic update to store immediately */
	apply: () => void;
	/** Rollback optimistic update on failure */
	rollback: () => void;
}

/**
 * WAL mutation configuration for facades.
 */
export interface WalMutationConfig<T = unknown> {
	operation: WalOperation;
	resourceType: string;
	resourceId?: number | string;
	endpoint: string;
	method: WalHttpMethod;
	/** Request body (must be JSON-serializable) */
	payload: unknown;
	/** Factory that creates the HTTP Observable (reused on retry) */
	http$: () => Observable<T>;
	/** Called when server confirms success */
	onCommit: (result: T) => void;
	/** Called on permanent failure (after max retries) */
	onError: (error: unknown) => void;
	/** Optimistic UI support */
	optimistic?: WalOptimisticConfig;
	/** Override default max retries (default: 5) */
	maxRetries?: number;
}
// #endregion

// #region Process Result
/** Result of processing a WAL entry. */
export type WalProcessResult =
	| { status: 'COMMITTED'; entryId: string }
	| { status: 'RETRYING'; entryId: string; retries: number; nextRetryAt: number }
	| { status: 'FAILED'; entryId: string; error: string }
	| { status: 'CONFLICT'; entryId: string };
// #endregion

// #region Stats
/** Aggregated WAL counts by status. */
export interface WalStats {
	pending: number;
	inFlight: number;
	failed: number;
	committed: number;
	conflict: number;
}
// #endregion

// #region Constants
/** Default WAL configuration values. */
export const WAL_DEFAULTS = {
	MAX_RETRIES: 5,
	/** Max backoff delay in ms (30 seconds) */
	MAX_BACKOFF_MS: 30_000,
	/** Base backoff delay in ms */
	BASE_BACKOFF_MS: 1_000,
	/** How long to keep committed entries (24 hours) */
	COMMITTED_TTL_MS: 24 * 60 * 60 * 1_000,
	/** Sync engine polling interval (10 seconds) */
	SYNC_INTERVAL_MS: 10_000,
	/** Idempotency header name */
	IDEMPOTENCY_HEADER: 'X-Idempotency-Key',
} as const;
// #endregion
