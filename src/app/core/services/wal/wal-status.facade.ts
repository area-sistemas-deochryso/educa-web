import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WalService } from './wal.service';
import { WalSyncEngine } from './wal-sync-engine.service';
import { WalStatusStore } from './wal-status.store';

/**
 * Facade for WAL status. Owns the subscription to the sync engine stream and
 * orchestrates IO against WalService, delegating state to WalStatusStore.
 */
@Injectable({ providedIn: 'root' })
export class WalStatusFacade {
	// #region Dependencies

	private wal = inject(WalService);
	private syncEngine = inject(WalSyncEngine);
	private store = inject(WalStatusStore);
	private destroyRef = inject(DestroyRef);

	// #endregion

	// #region Public Readonly (delegated)

	readonly vm = this.store.vm;
	readonly pendingCount = this.store.pendingCount;
	readonly failedCount = this.store.failedCount;
	readonly isSyncing = this.store.isSyncing;
	readonly lastSyncTime = this.store.lastSyncTime;
	readonly failedEntries = this.store.failedEntries;
	readonly migrationCount = this.store.migrationCount;
	readonly hasPending = this.store.hasPending;
	readonly hasFailures = this.store.hasFailures;
	readonly hasActivity = this.store.hasActivity;
	readonly hasMigrations = this.store.hasMigrations;

	// #endregion

	// #region Initialization

	constructor() {
		this.syncEngine.entryProcessed$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.store.setLastSyncTime(Date.now());
				this.refresh();
			});

		this.refresh();
	}

	// #endregion

	// #region Commands

	/**
	 * Refresh counts and failed entries from WAL.
	 */
	async refresh(): Promise<void> {
		try {
			const [stats, failedEntries, migrationEntries] = await Promise.all([
				this.wal.getStats(),
				this.wal.getFailedEntries(),
				this.wal.getMigrationEntries(),
			]);

			this.store.setPendingCount(stats.pending);
			this.store.setInFlightCount(stats.inFlight);
			this.store.setFailedCount(stats.failed);
			this.store.setFailedEntries(failedEntries);
			this.store.setMigrationCount(migrationEntries.length);
			this.store.setIsSyncing(this.syncEngine.isProcessing);
		} catch {
			// WAL might not be available (SSR, no IndexedDB)
		}
	}

	/**
	 * Retry a failed entry and refresh state.
	 */
	async retryEntry(id: string): Promise<void> {
		await this.wal.retryEntry(id);
		await this.refresh();
	}

	/**
	 * Discard a failed entry and refresh state.
	 */
	async discardEntry(id: string): Promise<void> {
		await this.wal.discardEntry(id);
		await this.refresh();
	}

	/**
	 * Discard all entries requiring schema migration and refresh state.
	 *
	 * @returns Number of entries discarded.
	 */
	async discardMigrationEntries(): Promise<number> {
		const count = await this.wal.discardMigrationEntries();
		await this.refresh();
		return count;
	}

	// #endregion
}
