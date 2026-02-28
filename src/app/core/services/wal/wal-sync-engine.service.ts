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
	EMPTY,
	catchError,
	tap,
	concatMap,
} from 'rxjs';
import { logger } from '@core/helpers';
import { SwService } from '@features/intranet/services/sw/sw.service';
import { WalService } from './wal.service';
import {
	WalEntry,
	WalMutationConfig,
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
		this.start();
	}
	/**
	 * Start sync engine timers and online listeners.
	 */
	start(): void {
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

		// On startup: recover IN_FLIGHT entries and cleanup old COMMITTED
		this.initRecovery();

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
	 * Process all PENDING entries (typically on reconnect).
	 */
	async processAllPending(): Promise<void> {
		if (this._isProcessing || !this.sw.isOnline) return;

		this._isProcessing = true;
		try {
			const entries = await this.wal.getPendingEntries();
			if (entries.length === 0) return;

			logger.log(`[WAL-Sync] Processing ${entries.length} pending entries`);

			for (const entry of entries) {
				if (!this.sw.isOnline) {
					logger.log('[WAL-Sync] Went offline, stopping processing');
					break;
				}
				await this.processEntry(entry);
			}
		} finally {
			this._isProcessing = false;
		}
	}

	/**
	 * Process retryable entries based on nextRetryAt.
	 */
	async processRetryable(): Promise<void> {
		if (this._isProcessing || !this.sw.isOnline) return;

		this._isProcessing = true;
		try {
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
	 *
	 * @param entry WAL entry.
	 */
	async processEntry(entry: WalEntry): Promise<WalProcessResult> {
		await this.wal.markInFlight(entry.id);

		const cb = this.callbacks.get(entry.id);

		try {
			const result = await this.sendRequest(entry, cb);

			// Success: COMMITTED
			await this.wal.markCommitted(entry.id);
			cb?.onCommit(result);
			this.callbacks.delete(entry.id);

			const processResult: WalProcessResult = {
				status: 'COMMITTED',
				entryId: entry.id,
			};
			this._entryProcessed$.next(processResult);
			return processResult;
		} catch (error) {
			return this.handleError(entry, error, cb);
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
	 * Prefers registered http$() callback and falls back to raw HttpClient.
	 *
	 * @param entry WAL entry to send.
	 * @param cb Optional callbacks for this entry.
	 */
	private sendRequest(
		entry: WalEntry,
		cb?: { http$: () => Observable<unknown> },
	): Promise<unknown> {
		return new Promise((resolve, reject) => {
			const request$ = cb
				? this.sendWithCallback(entry, cb)
				: this.sendWithRawHttp(entry);

			request$.subscribe({
				next: (result) => resolve(result),
				error: (err) => reject(err),
			});
		});
	}

	/**
	 * Send using the registered http$ factory.
	 * The idempotency header is added at the facade level.
	 *
	 * @param _entry WAL entry (unused).
	 * @param cb Callback wrapper with http$ factory.
	 */
	private sendWithCallback(
		_entry: WalEntry,
		cb: { http$: () => Observable<unknown> },
	): Observable<unknown> {
		// The http$ factory already includes interceptors (auth, error, etc.)
		// The idempotency header is added at the facade level when creating http$
		return cb.http$();
	}

	/**
	 * Fallback: send raw HTTP request when callbacks are lost (app reload).
	 * Uses HttpClient directly. Interceptors (auth, etc.) still apply.
	 *
	 * @param entry WAL entry to send.
	 */
	private sendWithRawHttp(entry: WalEntry): Observable<unknown> {
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
		// 4xx errors (except 408 Request Timeout and 429 Too Many Requests) are permanent
		return (
			error.status >= 400 &&
			error.status < 500 &&
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

	// #region Recovery

	/**
	 * On startup: recover IN_FLIGHT entries and cleanup old COMMITTED.
	 */
	private async initRecovery(): Promise<void> {
		try {
			const [recovered, cleaned] = await Promise.all([
				this.wal.recoverInFlight(),
				this.wal.cleanup(),
			]);

			if (recovered > 0 || cleaned > 0) {
				logger.log(
					`[WAL-Sync] Recovery: ${recovered} in-flight recovered, ${cleaned} old committed cleaned`,
				);
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
}
