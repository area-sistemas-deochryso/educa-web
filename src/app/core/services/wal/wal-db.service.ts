import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@core/helpers';
import { WalEntry, WalEntryStatus } from './models';

const DB_NAME = 'educa-wal-db';
const DB_VERSION = 1;
const STORE_NAME = 'wal-entries';

/**
 * Low level IndexedDB access for WAL entries.
 */
@Injectable({ providedIn: 'root' })
export class WalDbService {
	private platformId = inject(PLATFORM_ID);
	private db: IDBDatabase | null = null;
	private dbReady: Promise<boolean> | null = null;

	// #region Initialization

	/**
	 * True when running in the browser.
	 */
	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	constructor() {
		if (this.isBrowser) {
			this.dbReady = this.initDB();
		}
	}

	/**
	 * Initialize IndexedDB database and object store.
	 */
	private initDB(): Promise<boolean> {
		return new Promise((resolve) => {
			if (!this.isBrowser || !('indexedDB' in window)) {
				logger.warn('[WAL-DB] IndexedDB not available');
				resolve(false);
				return;
			}

			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => {
				logger.error('[WAL-DB] Error opening database:', request.error);
				resolve(false);
			};

			request.onsuccess = () => {
				this.db = request.result;
				resolve(true);
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;

				if (!db.objectStoreNames.contains(STORE_NAME)) {
					const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
					store.createIndex('status', 'status', { unique: false });
					store.createIndex('resourceType', 'resourceType', { unique: false });
					store.createIndex('timestamp', 'timestamp', { unique: false });
					store.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
				}

				logger.log('[WAL-DB] Database created/upgraded to version', DB_VERSION);
			};
		});
	}
	/**
	 * Ensure database is ready and return the instance.
	 */
	private async ensureDB(): Promise<IDBDatabase | null> {
		if (this.dbReady) {
			await this.dbReady;
		}
		return this.db;
	}

	// #endregion

	// #region Write Operations
	/**
	 * Persist or update a WAL entry.
	 * Rejects on QuotaExceededError so callers can fall back to direct HTTP.
	 *
	 * @param entry WAL entry.
	 */
	async put(entry: WalEntry): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve, reject) => {
			try {
				const tx = db.transaction(STORE_NAME, 'readwrite');
				tx.objectStore(STORE_NAME).put(entry);
				tx.oncomplete = () => resolve();
				tx.onerror = () => {
					const error = tx.error;
					if (error?.name === 'QuotaExceededError') {
						logger.error('[WAL-DB] Storage quota exceeded — entry will use direct HTTP fallback');
						reject(error);
						return;
					}
					logger.error('[WAL-DB] Error writing entry:', error);
					resolve();
				};
			} catch (e) {
				if (e instanceof DOMException && e.name === 'QuotaExceededError') {
					logger.error('[WAL-DB] Storage quota exceeded — entry will use direct HTTP fallback');
					reject(e);
					return;
				}
				logger.error('[WAL-DB] Transaction error:', e);
				resolve();
			}
		});
	}
	/**
	 * Delete an entry by id.
	 *
	 * @param id Entry id.
	 */
	async delete(id: string): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const tx = db.transaction(STORE_NAME, 'readwrite');
				tx.objectStore(STORE_NAME).delete(id);
				tx.oncomplete = () => resolve();
				tx.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	/**
	 * Delete COMMITTED entries older than a timestamp.
	 *
	 * @param timestamp Cutoff timestamp.
	 * @returns Number of entries deleted.
	 */
	async deleteCommittedOlderThan(timestamp: number): Promise<number> {
		const db = await this.ensureDB();
		if (!db) return 0;

		return new Promise((resolve) => {
			try {
				const tx = db.transaction(STORE_NAME, 'readwrite');
				const store = tx.objectStore(STORE_NAME);
				const index = store.index('status');
				const request = index.openCursor(IDBKeyRange.only('COMMITTED'));
				let deleted = 0;

				request.onsuccess = (event) => {
					const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
					if (cursor) {
						const entry = cursor.value as WalEntry;
						if (entry.committedAt && entry.committedAt < timestamp) {
							cursor.delete();
							deleted++;
						}
						cursor.continue();
					}
				};

				tx.oncomplete = () => resolve(deleted);
				tx.onerror = () => resolve(deleted);
			} catch {
				resolve(0);
			}
		});
	}
	/**
	 * Clear all WAL entries.
	 */
	async clear(): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const tx = db.transaction(STORE_NAME, 'readwrite');
				tx.objectStore(STORE_NAME).clear();
				tx.oncomplete = () => resolve();
				tx.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	// #endregion

	// #region Read Operations
	/**
	 * Get a WAL entry by id.
	 *
	 * @param id Entry id.
	 */
	async get(id: string): Promise<WalEntry | undefined> {
		const db = await this.ensureDB();
		if (!db) return undefined;

		return new Promise((resolve) => {
			try {
				const tx = db.transaction(STORE_NAME, 'readonly');
				const request = tx.objectStore(STORE_NAME).get(id);
				request.onsuccess = () => resolve(request.result as WalEntry | undefined);
				request.onerror = () => resolve(undefined);
			} catch {
				resolve(undefined);
			}
		});
	}
	/**
	 * Get entries by status ordered by timestamp.
	 *
	 * @param status Entry status.
	 */
	async getByStatus(status: WalEntryStatus): Promise<WalEntry[]> {
		const db = await this.ensureDB();
		if (!db) return [];

		return new Promise((resolve) => {
			try {
				const tx = db.transaction(STORE_NAME, 'readonly');
				const index = tx.objectStore(STORE_NAME).index('status');
				const request = index.getAll(IDBKeyRange.only(status));
				request.onsuccess = () => {
					const entries = (request.result as WalEntry[]) ?? [];
					// Sort by timestamp ASC (FIFO)
					entries.sort((a, b) => a.timestamp - b.timestamp);
					resolve(entries);
				};
				request.onerror = () => resolve([]);
			} catch {
				resolve([]);
			}
		});
	}

	/**
	 * Get PENDING entries ordered by timestamp.
	 */
	async getPending(): Promise<WalEntry[]> {
		return this.getByStatus('PENDING');
	}
	/**
	 * Get FAILED entries.
	 */
	async getFailed(): Promise<WalEntry[]> {
		return this.getByStatus('FAILED');
	}

	/**
	 * Get PENDING entries ready for retry.
	 */
	async getRetryable(): Promise<WalEntry[]> {
		const pending = await this.getPending();
		const now = Date.now();
		return pending.filter((e) => !e.nextRetryAt || e.nextRetryAt <= now);
	}
	/**
	 * Count entries by status or all entries.
	 *
	 * @param status Optional status filter.
	 */
	async count(status?: WalEntryStatus): Promise<number> {
		const db = await this.ensureDB();
		if (!db) return 0;

		return new Promise((resolve) => {
			try {
				const tx = db.transaction(STORE_NAME, 'readonly');
				const store = tx.objectStore(STORE_NAME);

				if (status) {
					const index = store.index('status');
					const request = index.count(IDBKeyRange.only(status));
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => resolve(0);
				} else {
					const request = store.count();
					request.onsuccess = () => resolve(request.result);
					request.onerror = () => resolve(0);
				}
			} catch {
				resolve(0);
			}
		});
	}
	/**
	 * Check if there are PENDING or IN_FLIGHT entries for a resourceType.
	 * Uses the resourceType index for efficient lookup.
	 */
	async hasActiveByResourceType(resourceType: string): Promise<boolean> {
		const db = await this.ensureDB();
		if (!db) return false;

		return new Promise((resolve) => {
			try {
				const tx = db.transaction(STORE_NAME, 'readonly');
				const index = tx.objectStore(STORE_NAME).index('resourceType');
				const request = index.getAll(IDBKeyRange.only(resourceType));
				request.onsuccess = () => {
					const entries = (request.result as WalEntry[]) ?? [];
					const hasActive = entries.some(
						(e) => e.status === 'PENDING' || e.status === 'IN_FLIGHT',
					);
					resolve(hasActive);
				};
				request.onerror = () => resolve(false);
			} catch {
				resolve(false);
			}
		});
	}

	/**
	 * Get all WAL entries.
	 */
	async getAll(): Promise<WalEntry[]> {
		const db = await this.ensureDB();
		if (!db) return [];

		return new Promise((resolve) => {
			try {
				const tx = db.transaction(STORE_NAME, 'readonly');
				const request = tx.objectStore(STORE_NAME).getAll();
				request.onsuccess = () => resolve((request.result as WalEntry[]) ?? []);
				request.onerror = () => resolve([]);
			} catch {
				resolve([]);
			}
		});
	}

	// #endregion

	// #region Availability
	/**
	 * Check if IndexedDB is available and initialized.
	 */
	async isAvailable(): Promise<boolean> {
		if (this.dbReady) {
			return await this.dbReady;
		}
		return false;
	}

	// #endregion
}
