import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@core/helpers';
import { WalEntry, WalEntryStatus, WalMode } from '../models';
import { WalStorageStrategy } from './wal-storage.strategy';

const DB_NAME = 'educa-wal-db';
const DB_VERSION = 1;
const STORE_NAME = 'wal-entries';

/**
 * Persistent storage backed by IndexedDB. Survives reload.
 *
 * `init()` resolves `false` when IndexedDB is unavailable (SSR, private
 * browsing in some browsers, permission revoked) or when `indexedDB.open`
 * errors out. The facade is responsible for enforcing a hard timeout.
 */
@Injectable({ providedIn: 'root' })
export class WalStorageIndexedDbStrategy implements WalStorageStrategy {
	readonly mode: WalMode = 'persistent';

	private platformId = inject(PLATFORM_ID);
	private db: IDBDatabase | null = null;

	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	init(): Promise<boolean> {
		return new Promise((resolve) => {
			if (!this.isBrowser || typeof indexedDB === 'undefined') {
				logger.warn('[WAL-DB] IndexedDB not available');
				resolve(false);
				return;
			}

			let request: IDBOpenDBRequest;
			try {
				request = indexedDB.open(DB_NAME, DB_VERSION);
			} catch (e) {
				logger.error('[WAL-DB] indexedDB.open threw synchronously:', e);
				resolve(false);
				return;
			}

			request.onerror = () => {
				logger.error('[WAL-DB] Error opening database:', request.error);
				resolve(false);
			};

			request.onblocked = () => {
				logger.warn('[WAL-DB] Database open blocked by another tab');
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

	async put(entry: WalEntry): Promise<void> {
		if (!this.db) return;

		return new Promise((resolve, reject) => {
			try {
				const tx = this.db!.transaction(STORE_NAME, 'readwrite');
				tx.objectStore(STORE_NAME).put(entry);
				tx.oncomplete = () => resolve();
				tx.onerror = () => {
					const error = tx.error;
					if (error?.name === 'QuotaExceededError') {
						logger.error(
							'[WAL-DB] Storage quota exceeded — entry will use direct HTTP fallback',
						);
						reject(error);
						return;
					}
					logger.error('[WAL-DB] Error writing entry:', error);
					resolve();
				};
			} catch (e) {
				if (e instanceof DOMException && e.name === 'QuotaExceededError') {
					logger.error(
						'[WAL-DB] Storage quota exceeded — entry will use direct HTTP fallback',
					);
					reject(e);
					return;
				}
				logger.error('[WAL-DB] Transaction error:', e);
				resolve();
			}
		});
	}

	async delete(id: string): Promise<void> {
		if (!this.db) return;

		return new Promise((resolve) => {
			try {
				const tx = this.db!.transaction(STORE_NAME, 'readwrite');
				tx.objectStore(STORE_NAME).delete(id);
				tx.oncomplete = () => resolve();
				tx.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	async deleteCommittedOlderThan(timestamp: number): Promise<number> {
		if (!this.db) return 0;

		return new Promise((resolve) => {
			try {
				const tx = this.db!.transaction(STORE_NAME, 'readwrite');
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

	async purgeByResourceType(resourceType: string): Promise<number> {
		if (!this.db) return 0;

		return new Promise((resolve) => {
			try {
				const tx = this.db!.transaction(STORE_NAME, 'readwrite');
				const store = tx.objectStore(STORE_NAME);
				const request = store.openCursor();
				let deleted = 0;

				request.onsuccess = (event) => {
					const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
					if (cursor) {
						const entry = cursor.value as WalEntry;
						if (entry.resourceType === resourceType) {
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

	async clear(): Promise<void> {
		if (!this.db) return;

		return new Promise((resolve) => {
			try {
				const tx = this.db!.transaction(STORE_NAME, 'readwrite');
				tx.objectStore(STORE_NAME).clear();
				tx.oncomplete = () => resolve();
				tx.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	async get(id: string): Promise<WalEntry | undefined> {
		if (!this.db) return undefined;

		return new Promise((resolve) => {
			try {
				const tx = this.db!.transaction(STORE_NAME, 'readonly');
				const request = tx.objectStore(STORE_NAME).get(id);
				request.onsuccess = () => resolve(request.result as WalEntry | undefined);
				request.onerror = () => resolve(undefined);
			} catch {
				resolve(undefined);
			}
		});
	}

	async getByStatus(status: WalEntryStatus): Promise<WalEntry[]> {
		if (!this.db) return [];

		return new Promise((resolve) => {
			try {
				const tx = this.db!.transaction(STORE_NAME, 'readonly');
				const index = tx.objectStore(STORE_NAME).index('status');
				const request = index.getAll(IDBKeyRange.only(status));
				request.onsuccess = () => {
					const entries = (request.result as WalEntry[]) ?? [];
					entries.sort((a, b) => a.timestamp - b.timestamp);
					resolve(entries);
				};
				request.onerror = () => resolve([]);
			} catch {
				resolve([]);
			}
		});
	}

	async count(status?: WalEntryStatus): Promise<number> {
		if (!this.db) return 0;

		return new Promise((resolve) => {
			try {
				const tx = this.db!.transaction(STORE_NAME, 'readonly');
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

	async hasActiveByResourceType(resourceType: string): Promise<boolean> {
		if (!this.db) return false;

		return new Promise((resolve) => {
			try {
				const tx = this.db!.transaction(STORE_NAME, 'readonly');
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

	async getAll(): Promise<WalEntry[]> {
		if (!this.db) return [];

		return new Promise((resolve) => {
			try {
				const tx = this.db!.transaction(STORE_NAME, 'readonly');
				const request = tx.objectStore(STORE_NAME).getAll();
				request.onsuccess = () => resolve((request.result as WalEntry[]) ?? []);
				request.onerror = () => resolve([]);
			} catch {
				resolve([]);
			}
		});
	}
}
