import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WalService } from './wal.service';
import { WalSyncEngine } from './wal-sync-engine.service';
import { WalEntry, WalStats } from './models';

/**
 * Store for WAL status indicators.
 */
@Injectable({ providedIn: 'root' })
export class WalStatusStore {
	// #region Dependencies

	private wal = inject(WalService);
	private syncEngine = inject(WalSyncEngine);
	private destroyRef = inject(DestroyRef);

	// #endregion

	// #region Private State

	/** Pending entry count. */
	private readonly _pendingCount = signal(0);
	/** In-flight entry count. */
	private readonly _inFlightCount = signal(0);
	/** Failed entry count. */
	private readonly _failedCount = signal(0);
	/** True while sync engine is processing. */
	private readonly _isSyncing = signal(false);
	/** Timestamp of last sync or null. */
	private readonly _lastSyncTime = signal<number | null>(null);
	/** Failed entries list. */
	private readonly _failedEntries = signal<WalEntry[]>([]);

	// #endregion

	// #region Public Readonly

	/** Pending entry count. */
	readonly pendingCount = this._pendingCount.asReadonly();
	/** Failed entry count. */
	readonly failedCount = this._failedCount.asReadonly();
	/** True while sync engine is processing. */
	readonly isSyncing = this._isSyncing.asReadonly();
	/** Timestamp of last sync or null. */
	readonly lastSyncTime = this._lastSyncTime.asReadonly();
	/** Failed entries list. */
	readonly failedEntries = this._failedEntries.asReadonly();

	// #endregion

	// #region Computed

	/** True when there are pending entries. */
	readonly hasPending = computed(() => this._pendingCount() > 0);
	/** True when there are failed entries. */
	readonly hasFailures = computed(() => this._failedCount() > 0);
	/** True when there is pending or in-flight activity. */
	readonly hasActivity = computed(
		() => this._pendingCount() > 0 || this._inFlightCount() > 0,
	);

	/** Aggregated view model for UI binding. */
	readonly vm = computed(() => ({
		pendingCount: this._pendingCount(),
		inFlightCount: this._inFlightCount(),
		failedCount: this._failedCount(),
		isSyncing: this._isSyncing(),
		lastSyncTime: this._lastSyncTime(),
		failedEntries: this._failedEntries(),
		hasPending: this.hasPending(),
		hasFailures: this.hasFailures(),
		hasActivity: this.hasActivity(),
	}));

	// #endregion

	// #region Initialization

	constructor() {
		// Refresh after each entry is processed
		this.syncEngine.entryProcessed$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this._lastSyncTime.set(Date.now());
				this.refresh();
			});

		// Initial load
		this.refresh();
	}

	// #endregion

	// #region Commands
	/**
	 * Refresh counts and failed entries from WAL.
	 */
	async refresh(): Promise<void> {
		try {
			const [stats, failedEntries] = await Promise.all([
				this.wal.getStats(),
				this.wal.getFailedEntries(),
			]);

			this._pendingCount.set(stats.pending);
			this._inFlightCount.set(stats.inFlight);
			this._failedCount.set(stats.failed);
			this._failedEntries.set(failedEntries);
			this._isSyncing.set(this.syncEngine.isProcessing);
		} catch {
			// Silently handle. WAL might not be available (SSR, no IndexedDB)
		}
	}

	/**
	 * Retry a failed entry and refresh state.
	 *
	 * @param id Entry id.
	 */
	async retryEntry(id: string): Promise<void> {
		await this.wal.retryEntry(id);
		await this.refresh();
	}

	/**
	 * Discard a failed entry and refresh state.
	 *
	 * @param id Entry id.
	 */
	async discardEntry(id: string): Promise<void> {
		await this.wal.discardEntry(id);
		await this.refresh();
	}

	// #endregion
}
