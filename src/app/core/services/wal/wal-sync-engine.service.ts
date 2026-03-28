import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
import { WalCacheInvalidator } from './wal-cache-invalidator.service';
import { WalCoalescer } from './wal-coalescer.service';
import {
	isConflictError,
	isPermanentError,
	extractErrorMessage,
} from './wal-error.utils';
import {
	WalEntry,
	WalProcessResult,
	WAL_DEFAULTS,
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
	private cacheInvalidator = inject(WalCacheInvalidator);
	private coalescer = inject(WalCoalescer);
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
			let entries = await this.wal.getRetryableEntries();

			while (entries.length > 0 && this.sw.isOnline) {
				// Coalesce duplicate UPDATEs to the same resource before processing
				entries = await this.coalescer.coalesce(entries, (id) =>
					this.callbacks.delete(id),
				);

				logger.log(`[WAL-Sync] Processing ${entries.length} pending entries`);

				for (const entry of entries) {
					if (!this.sw.isOnline) {
						logger.log('[WAL-Sync] Went offline, stopping processing');
						return;
					}
					await this.processEntry(entry);
				}

				// Drain: pick up new entries added while we were processing
				entries = await this.wal.getRetryableEntries();
			}
		} finally {
			this._isProcessing = false;
		}
	}

	/**
	 * Process retryable entries based on nextRetryAt.
	 * Also recovers stale IN_FLIGHT entries as a safety net.
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
	 * Outer try/catch ensures entry never stays stuck IN_FLIGHT.
	 */
	async processEntry(entry: WalEntry): Promise<WalProcessResult> {
		try {
			await this.wal.markInFlight(entry.id);

			const cb = this.callbacks.get(entry.id);

			try {
				const result = await this.sendRequest(entry);

				// Success: commit, invalidate cache, then notify
				await this.wal.commitAndClean(entry.id);
				await this.cacheInvalidator.invalidateForEntry(entry);
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
	 */
	async sendNow(entry: WalEntry): Promise<WalProcessResult> {
		return this.processEntry(entry);
	}

	// #endregion

	// #region HTTP

	/**
	 * Send the HTTP request for a WAL entry.
	 * Always uses raw HttpClient with X-Idempotency-Key header (entry.id).
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
		// 409 Conflict → mark conflict, no retry
		if (isConflictError(error)) {
			await this.wal.markConflict(entry.id);
			this.callbacks.delete(entry.id);

			const result: WalProcessResult = {
				status: 'CONFLICT',
				entryId: entry.id,
			};
			this._entryProcessed$.next(result);
			return result;
		}

		// Permanent error (4xx except 409) → mark failed, rollback
		if (isPermanentError(error)) {
			const errorMsg = extractErrorMessage(error);
			await this.wal.markFailed(entry.id, errorMsg);
			await this.cacheInvalidator.invalidateForEntry(entry);
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

		// Retryable error (network, timeout, 5xx) → increment retry
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
	 * Follower tabs invalidate their cache for the resource.
	 */
	private async handleCrossTabCommit(
		entryId: string,
		resourceType: string,
	): Promise<void> {
		await this.cacheInvalidator.invalidateForCrossTab(
			resourceType,
			entryId,
		);

		// Emit so WalStatusStore refreshes counts
		this._entryProcessed$.next({ status: 'COMMITTED', entryId });
	}

	// #endregion
}
