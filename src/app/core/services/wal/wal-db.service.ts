import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@core/helpers';
import { WalEntry, WalEntryStatus } from './models';
import { WalStatusStore } from './wal-status.store';
import {
	WAL_STORAGE_INIT_TIMEOUT_MS,
	WalStorageStrategy,
} from './storage/wal-storage.strategy';
import { WalStorageIndexedDbStrategy } from './storage/wal-storage-indexeddb.strategy';
import { WalStorageMemoryStrategy } from './storage/wal-storage-memory.strategy';

/**
 * Low level WAL storage facade.
 *
 * Selects between {@link WalStorageIndexedDbStrategy} (default) and
 * {@link WalStorageMemoryStrategy} (fallback) at boot. The IndexedDB
 * strategy has {@link WAL_STORAGE_INIT_TIMEOUT_MS} to initialize; if it
 * times out or resolves `false` (private browsing, quota, permission),
 * we degrade to the in-memory strategy and mark
 * {@link WalStatusStore.setMode | mode = 'ephemeral'} (INV-WAL-RES08/09/10).
 *
 * The public contract is identical to the previous direct-IndexedDB
 * implementation — no consumer should change.
 */
@Injectable({ providedIn: 'root' })
export class WalDbService {
	private platformId = inject(PLATFORM_ID);
	private indexedDb = inject(WalStorageIndexedDbStrategy);
	private memory = inject(WalStorageMemoryStrategy);
	private statusStore = inject(WalStatusStore);

	private strategy: WalStorageStrategy = this.memory;
	private readyPromise: Promise<boolean> | null = null;

	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	constructor() {
		if (this.isBrowser) {
			this.readyPromise = this.bootstrap();
		}
	}

	// #region Bootstrap

	/**
	 * Try IndexedDB first with a hard timeout. On any failure (false, throw,
	 * or timeout) swap to the memory strategy and broadcast `ephemeral`.
	 */
	private async bootstrap(): Promise<boolean> {
		const indexedDbReady = await this.tryIndexedDb();

		if (indexedDbReady) {
			this.strategy = this.indexedDb;
			this.statusStore.setMode('persistent');
			return true;
		}

		await this.memory.init();
		this.strategy = this.memory;
		this.statusStore.setMode('ephemeral');
		logger.warn('[WAL-DB] Degraded to in-memory storage (ephemeral mode)');
		return true;
	}

	private async tryIndexedDb(): Promise<boolean> {
		const timeoutPromise = new Promise<boolean>((resolve) => {
			setTimeout(() => {
				logger.error(
					`[WAL-DB] IndexedDB init timed out after ${WAL_STORAGE_INIT_TIMEOUT_MS}ms`,
				);
				resolve(false);
			}, WAL_STORAGE_INIT_TIMEOUT_MS);
		});

		try {
			return await Promise.race([this.indexedDb.init(), timeoutPromise]);
		} catch (e) {
			logger.error('[WAL-DB] IndexedDB init threw:', e);
			return false;
		}
	}

	private async ensureReady(): Promise<void> {
		if (this.readyPromise) {
			await this.readyPromise;
		}
	}

	// #endregion

	// #region Write Operations

	async put(entry: WalEntry): Promise<void> {
		await this.ensureReady();
		return this.strategy.put(entry);
	}

	async delete(id: string): Promise<void> {
		await this.ensureReady();
		return this.strategy.delete(id);
	}

	async deleteCommittedOlderThan(timestamp: number): Promise<number> {
		await this.ensureReady();
		return this.strategy.deleteCommittedOlderThan(timestamp);
	}

	async purgeByResourceType(resourceType: string): Promise<number> {
		await this.ensureReady();
		return this.strategy.purgeByResourceType(resourceType);
	}

	async clear(): Promise<void> {
		await this.ensureReady();
		return this.strategy.clear();
	}

	// #endregion

	// #region Read Operations

	async get(id: string): Promise<WalEntry | undefined> {
		await this.ensureReady();
		return this.strategy.get(id);
	}

	async getByStatus(status: WalEntryStatus): Promise<WalEntry[]> {
		await this.ensureReady();
		return this.strategy.getByStatus(status);
	}

	async getPending(): Promise<WalEntry[]> {
		return this.getByStatus('PENDING');
	}

	async getFailed(): Promise<WalEntry[]> {
		return this.getByStatus('FAILED');
	}

	async getRetryable(): Promise<WalEntry[]> {
		const pending = await this.getPending();
		const now = Date.now();
		return pending.filter((e) => !e.nextRetryAt || e.nextRetryAt <= now);
	}

	async count(status?: WalEntryStatus): Promise<number> {
		await this.ensureReady();
		return this.strategy.count(status);
	}

	async hasActiveByResourceType(resourceType: string): Promise<boolean> {
		await this.ensureReady();
		return this.strategy.hasActiveByResourceType(resourceType);
	}

	async getAll(): Promise<WalEntry[]> {
		await this.ensureReady();
		return this.strategy.getAll();
	}

	// #endregion

	// #region Availability / Diagnostics

	/**
	 * True once the facade has selected a strategy (either persistent or
	 * ephemeral). Returns false in non-browser environments.
	 */
	async isAvailable(): Promise<boolean> {
		if (!this.readyPromise) return false;
		return this.readyPromise;
	}

	/**
	 * Current storage mode. Useful for diagnostics — UI consumers should
	 * read {@link WalStatusStore.mode} instead.
	 */
	getMode(): WalStorageStrategy['mode'] {
		return this.strategy.mode;
	}

	// #endregion
}
