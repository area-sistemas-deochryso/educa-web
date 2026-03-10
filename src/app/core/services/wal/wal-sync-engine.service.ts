import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import {
	Observable,
	Subject,
	Subscription,
	interval,
	filter,
	switchMap,
	from,
} from 'rxjs';
import { logger } from '@core/helpers';
import { environment } from '@config';
import { SwService } from '@features/intranet/services/sw/sw.service';
import { WalService } from './wal.service';
import { WalLeaderService } from './wal-leader.service';
import { WalMetricsService } from './wal-metrics.service';
import {
	WalEntry,
	WalProcessResult,
	WAL_DEFAULTS,
	WAL_CACHE_MAP,
} from './models';

/**
 * Processes pending WAL entries with retry and backoff.
 */
@Injectable({ providedIn: 'root' })
export class WalSyncEngine {
	// #region Dependencies

	private wal = inject(WalService);
	private sw = inject(SwService);
	private http = inject(HttpClient);
	private leader = inject(WalLeaderService);
	private walMetrics = inject(WalMetricsService);
	private destroyRef = inject(DestroyRef);

	// #endregion

	// #region State

	private _isProcessing = false;
	private _isRunning = false;
	private timerSub: Subscription | null = null;

	/**
	 * In-memory registry of callbacks by entry ID.
	 * Callbacks are NOT persisted. If the app reloads,
	 * entries are re-processed without callbacks (HTTP only).
	 */
	private callbacks = new Map<
		string,
		{
			http$: () => Observable<unknown>;
			onCommit: (result: unknown) => void;
			onError: (error: unknown) => void;
			rollback?: () => void;
		}
	>();

	/** Emits after each entry is processed. */
	private _entryProcessed$ = new Subject<WalProcessResult>();
	readonly entryProcessed$ = this._entryProcessed$.asObservable();

	// #endregion

	// #region Lifecycle

	constructor() {
		// Push processed results to metrics (breaks circular dep: metrics no longer injects us)
		this._entryProcessed$.subscribe((result) => {
			this.walMetrics.recordProcessResult(result);
		});

		this.init();
	}

	/**
	 * Async initialization: recovery MUST complete before processing starts.
	 * Prevents race condition where isOnline$ triggers processAllPending()
	 * before IN_FLIGHT entries from previous session are recovered.
	 */
	private async init(): Promise<void> {
		// Phase 0: Start leader election
		this.leader.start();

		// Listen for entries committed by other tabs (follower mode)
		this.leader.entryCommittedByOtherTab$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((event) => {
				this.handleCrossTabCommit(event.entryId, event.resourceType);
			});

		// Phase 1: Recover stale entries and cleanup
		await this.initRecovery();

		// Phase 2: Start listeners (only after recovery completes)
		this.startListeners();
	}

	/**
	 * Start sync engine timers and online listeners.
	 */
	private startListeners(): void {
		if (this._isRunning) return;
		this._isRunning = true;

		// When connectivity is restored, process all pending
		this.sw.isOnline$
			.pipe(
				filter((online) => online),
				switchMap(() => from(this.processAllPending())),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe();

		// Periodic timer: process retryable entries every SYNC_INTERVAL_MS
		this.timerSub = interval(WAL_DEFAULTS.SYNC_INTERVAL_MS)
			.pipe(
				filter(() => this.sw.isOnline && !this._isProcessing),
				switchMap(() => from(this.processRetryable())),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe();

		logger.log('[WAL-Sync] Engine started');
	}
	/**
	 * Stop sync engine timers.
	 */
	stop(): void {
		this._isRunning = false;
		this.timerSub?.unsubscribe();
		this.timerSub = null;
		logger.log('[WAL-Sync] Engine stopped');
	}

	// #endregion

	// #region Callback Registration

	/**
	 * Register callbacks for an entry in this session.
	 *
	 * @param entryId Entry id.
	 * @param config Callback handlers for http, commit, error, and rollback.
	 */
	registerCallbacks<T>(
		entryId: string,
		config: {
			http$: () => Observable<T>;
			onCommit: (result: T) => void;
			onError: (error: unknown) => void;
			rollback?: () => void;
		},
	): void {
		this.callbacks.set(entryId, config as {
			http$: () => Observable<unknown>;
			onCommit: (result: unknown) => void;
			onError: (error: unknown) => void;
			rollback?: () => void;
		});
	}
	/**
	 * Remove callbacks for an entry.
	 *
	 * @param entryId Entry id.
	 */
	unregisterCallbacks(entryId: string): void {
		this.callbacks.delete(entryId);
	}

	// #endregion

	// #region Processing

	get isProcessing(): boolean {
		return this._isProcessing;
	}

	/**
	 * Process all PENDING entries serially (typically on reconnect).
	 * Drain loop: re-checks for new entries added during processing
	 * so rapid-fire mutations are serialized without waiting for the timer.
	 * Only the leader tab processes entries to prevent cross-tab duplicates.
	 */
	async processAllPending(): Promise<void> {
		if (this._isProcessing || !this.sw.isOnline || !this.leader.isLeader) return;

		this._isProcessing = true;
		try {
			let entries = await this.wal.getPendingEntries();

			while (entries.length > 0 && this.sw.isOnline) {
				// Coalesce duplicate UPDATEs to the same resource before processing
				entries = await this.coalesceEntries(entries);

				logger.log(`[WAL-Sync] Processing ${entries.length} pending entries`);

				for (const entry of entries) {
					if (!this.sw.isOnline) {
						logger.log('[WAL-Sync] Went offline, stopping processing');
						return;
					}
					await this.processEntry(entry);
				}

				// Drain: pick up entries added while we were processing
				entries = await this.wal.getPendingEntries();
			}
		} finally {
			this._isProcessing = false;
		}
	}

	/**
	 * Process retryable entries based on nextRetryAt.
	 * Also recovers stale IN_FLIGHT entries as a safety net:
	 * if _isProcessing is false, no entries should be legitimately IN_FLIGHT.
	 */
	async processRetryable(): Promise<void> {
		if (this._isProcessing || !this.sw.isOnline || !this.leader.isLeader) return;

		this._isProcessing = true;
		try {
			// Safety net: if we're not processing, any IN_FLIGHT entries are stale
			await this.wal.recoverInFlight();

			const entries = await this.wal.getRetryableEntries();
			if (entries.length === 0) return;

			logger.log(`[WAL-Sync] Processing ${entries.length} retryable entries`);

			for (const entry of entries) {
				if (!this.sw.isOnline) break;
				await this.processEntry(entry);
			}
		} finally {
			this._isProcessing = false;
		}
	}

	/**
	 * Process a single WAL entry and return the result.
	 * Outer try/catch ensures entry never stays stuck IN_FLIGHT
	 * even if an unexpected error occurs (IndexedDB failure, etc.).
	 *
	 * @param entry WAL entry.
	 */
	async processEntry(entry: WalEntry): Promise<WalProcessResult> {
		try {
			await this.wal.markInFlight(entry.id);

			const cb = this.callbacks.get(entry.id);

			try {
				const result = await this.sendRequest(entry);

				// Success: commit, invalidate cache, then notify
				await this.wal.commitAndClean(entry.id);
				await this.invalidateCacheForEntry(entry);
				cb?.onCommit(result);
				this.callbacks.delete(entry.id);

				// Record latency metric (development only)
				if (!environment.production) {
					this.walMetrics.recordLatency(Date.now() - entry.timestamp);
				}

				// Notify other tabs so they can invalidate their caches
				this.leader.notifyEntryCommitted(entry.id, entry.resourceType);

				const processResult: WalProcessResult = {
					status: 'COMMITTED',
					entryId: entry.id,
					resourceType: entry.resourceType,
					hadCallback: !!cb,
				};
				this._entryProcessed$.next(processResult);
				return processResult;
			} catch (error) {
				return this.handleError(entry, error, cb);
			}
		} catch (unexpected) {
			// Safety net: entry stuck IN_FLIGHT due to unexpected error
			// Reset to PENDING so the periodic timer can retry it
			logger.error('[WAL-Sync] Unexpected error, resetting entry to PENDING:', unexpected);
			try {
				const current = await this.wal.getEntry(entry.id);
				if (current && current.status === 'IN_FLIGHT') {
					await this.wal.retryEntry(entry.id);
				}
			} catch {
				// DB unavailable — safety net in processRetryable will catch it
			}

			const result: WalProcessResult = {
				status: 'FAILED',
				entryId: entry.id,
				error: 'Unexpected processing error',
			};
			this._entryProcessed$.next(result);
			return result;
		}
	}

	/**
	 * Immediately send a single entry.
	 *
	 * @param entry WAL entry.
	 */
	async sendNow(entry: WalEntry): Promise<WalProcessResult> {
		return this.processEntry(entry);
	}

	// #endregion

	// #region HTTP

	/**
	 * Send the HTTP request for a WAL entry.
	 * Always uses raw HttpClient with X-Idempotency-Key header (entry.id).
	 * Callbacks (onCommit/onError/rollback) are used separately after the request.
	 *
	 * @param entry WAL entry to send.
	 */
	private sendRequest(entry: WalEntry): Promise<unknown> {
		return new Promise((resolve, reject) => {
			this.sendHttp(entry).subscribe({
				next: (result) => resolve(result),
				error: (err) => reject(err),
			});
		});
	}

	/**
	 * Send HTTP request with idempotency header.
	 * Uses entry data (endpoint, method, payload) directly.
	 * Interceptors (auth, error, rate-limit, etc.) still apply.
	 */
	private sendHttp(entry: WalEntry): Observable<unknown> {
		const headers = new HttpHeaders().set(
			WAL_DEFAULTS.IDEMPOTENCY_HEADER,
			entry.id,
		);

		switch (entry.method) {
			case 'POST':
				return this.http.post(entry.endpoint, entry.payload, { headers });
			case 'PUT':
				return this.http.put(entry.endpoint, entry.payload, { headers });
			case 'PATCH':
				return this.http.patch(entry.endpoint, entry.payload, { headers });
			case 'DELETE':
				return this.http.delete(entry.endpoint, { headers });
		}
	}

	// #endregion

	// #region Error Handling

	/**
	 * Handle error and compute final process result.
	 */
	private async handleError(
		entry: WalEntry,
		error: unknown,
		cb?: {
			onError: (error: unknown) => void;
			rollback?: () => void;
		},
	): Promise<WalProcessResult> {
		// 409 Conflict  mark conflict, no retry
		if (this.isConflict(error)) {
			await this.wal.markConflict(entry.id);
			this.callbacks.delete(entry.id);

			const result: WalProcessResult = {
				status: 'CONFLICT',
				entryId: entry.id,
			};
			this._entryProcessed$.next(result);
			return result;
		}

		// Permanent error (4xx except 409)  mark failed, rollback
		if (this.isPermanentError(error)) {
			const errorMsg = this.extractErrorMessage(error);
			await this.wal.markFailed(entry.id, errorMsg);
			await this.invalidateCacheForEntry(entry);
			cb?.rollback?.();
			cb?.onError(error);
			this.callbacks.delete(entry.id);

			const result: WalProcessResult = {
				status: 'FAILED',
				entryId: entry.id,
				error: errorMsg,
			};
			this._entryProcessed$.next(result);
			return result;
		}

		// Retryable error (network, timeout, 5xx)  increment retry
		const updated = await this.wal.incrementRetry(entry.id);

		if (!updated || updated.status === 'FAILED') {
			// Max retries exceeded
			cb?.rollback?.();
			cb?.onError(error);
			this.callbacks.delete(entry.id);

			const result: WalProcessResult = {
				status: 'FAILED',
				entryId: entry.id,
				error: `Max retries (${entry.maxRetries}) exceeded`,
			};
			this._entryProcessed$.next(result);
			return result;
		}

		// Will retry later
		const result: WalProcessResult = {
			status: 'RETRYING',
			entryId: entry.id,
			retries: updated.retries,
			nextRetryAt: updated.nextRetryAt!,
		};
		this._entryProcessed$.next(result);
		return result;
	}

	private isConflict(error: unknown): boolean {
		return error instanceof HttpErrorResponse && error.status === 409;
	}

	private isPermanentError(error: unknown): boolean {
		if (!(error instanceof HttpErrorResponse)) return false;
		// 4xx errors are permanent, except:
		// - 401 Unauthorized (token may have expired, retryable after re-auth)
		// - 408 Request Timeout
		// - 409 Conflict (handled separately)
		// - 429 Too Many Requests
		return (
			error.status >= 400 &&
			error.status < 500 &&
			error.status !== 401 &&
			error.status !== 408 &&
			error.status !== 409 &&
			error.status !== 429
		);
	}

	private extractErrorMessage(error: unknown): string {
		if (error instanceof HttpErrorResponse) {
			if (error.status === 0) return 'Network error';
			const serverMsg =
				error.error?.message || error.error?.error || error.statusText;
			return `HTTP ${error.status}: ${serverMsg}`;
		}
		if (error instanceof Error) return error.message;
		return String(error);
	}

	// #endregion

	// #region Cache Invalidation

	/**
	 * Invalidate SW cache patterns associated with a WAL entry's resourceType.
	 * Called after commit (so refetch hits network) and after permanent failure
	 * (so rollback doesn't leave stale cache).
	 *
	 * Uses WAL_CACHE_MAP for explicit mappings. Falls back to auto-extraction
	 * from the entry's endpoint URL for unmapped resource types.
	 */
	private async invalidateCacheForEntry(entry: WalEntry): Promise<void> {
		const patterns = WAL_CACHE_MAP[entry.resourceType]
			?? this.extractPatternsFromEndpoint(entry.endpoint);

		if (!patterns.length) return;

		try {
			const results = await Promise.all(
				patterns.map((p) => this.sw.invalidateCacheByPattern(p)),
			);
			const total = results.reduce((sum, n) => sum + n, 0);
			if (total > 0) {
				logger.log(
					`[WAL-Sync] Cache invalidated for ${entry.resourceType}: ${total} entries`,
				);
			}
		} catch (e) {
			// Non-critical: cache will expire via TTL anyway
			logger.warn('[WAL-Sync] Cache invalidation failed:', e);
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

	// #endregion

	// #region Recovery

	/**
	 * On startup: recover IN_FLIGHT entries and cleanup old COMMITTED.
	 */
	private async initRecovery(): Promise<void> {
		try {
			const [recovered, cleaned, migrationNeeded] = await Promise.all([
				this.wal.recoverInFlight(),
				this.wal.cleanup(),
				this.wal.checkSchemaMigrations(),
			]);

			if (recovered > 0 || cleaned > 0 || migrationNeeded > 0) {
				logger.log(
					`[WAL-Sync] Recovery: ${recovered} in-flight recovered, ${cleaned} old committed cleaned, ${migrationNeeded} need migration`,
				);
			}

			// Emit migration results so UI can show them
			if (migrationNeeded > 0) {
				const migrationEntries = await this.wal.getMigrationEntries();
				for (const entry of migrationEntries) {
					const result: WalProcessResult = {
						status: 'REQUIRES_MIGRATION',
						entryId: entry.id,
						fromVersion: entry.schemaVersion ?? 0,
					};
					this._entryProcessed$.next(result);
				}
			}

			// Process any pending entries after recovery
			if (this.sw.isOnline) {
				await this.processAllPending();
			}
		} catch (e) {
			logger.error('[WAL-Sync] Recovery error:', e);
		}
	}

	// #endregion

	// #region Cross-tab Coordination

	/**
	 * Handle a WAL entry committed by the leader tab.
	 * Follower tabs invalidate their cache for the resource so
	 * the next GET brings fresh data from the server.
	 */
	private async handleCrossTabCommit(
		entryId: string,
		resourceType: string,
	): Promise<void> {
		const patterns = WAL_CACHE_MAP[resourceType] ?? [`/api/${resourceType}`];
		if (!patterns.length) return;

		try {
			const results = await Promise.all(
				patterns.map((p) => this.sw.invalidateCacheByPattern(p)),
			);
			const total = results.reduce((sum, n) => sum + n, 0);
			if (total > 0) {
				logger.log(
					`[WAL-Sync] Cross-tab cache invalidated for ${resourceType}: ${total} entries (entry ${entryId.slice(0, 8)})`,
				);
			}
		} catch (e) {
			logger.warn('[WAL-Sync] Cross-tab cache invalidation failed:', e);
		}

		// Emit so WalStatusStore refreshes counts
		this._entryProcessed$.next({ status: 'COMMITTED', entryId });
	}

	// #endregion

	// #region Coalescence

	/**
	 * Merge multiple PENDING UPDATE entries targeting the same resource.
	 * Only the latest UPDATE per (resourceType + resourceId) is kept;
	 * older entries are deleted from IndexedDB and their callbacks cleaned up.
	 *
	 * CREATE, DELETE, TOGGLE, and CUSTOM operations are never coalesced.
	 */
	private async coalesceEntries(entries: WalEntry[]): Promise<WalEntry[]> {
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
						latest.payload = { ...(older.payload as Record<string, unknown>), ...(latest.payload as Record<string, unknown>) };
					}
				}
				await this.wal.updateEntryPayload(latest.id, latest.payload);
			}

			survivingUpdates.push(latest);

			// Delete older entries
			for (let i = 1; i < group.length; i++) {
				const stale = group[i];
				await this.wal.discardEntry(stale.id);
				this.callbacks.delete(stale.id);
				totalCoalesced++;
			}
		}

		if (totalCoalesced > 0) {
			logger.log(`[WAL-Sync] Coalesced ${totalCoalesced} duplicate UPDATE entries`);
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

	// #endregion
}
