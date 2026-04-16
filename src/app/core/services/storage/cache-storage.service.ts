import { Injectable, inject } from '@angular/core';
import { IndexedDBService, IDB_STORES } from './indexed-db.service';

/**
 * Generic cache record shape in IndexedDB.
 */
interface CacheRecord<T = unknown> {
	key: string;
	value: T;
	expiresAt: number | null;
	createdAt: number;
}

/**
 * Domain storage service for generic cache persistence in IndexedDB.
 */
@Injectable({
	providedIn: 'root',
})
export class CacheStorageService {
	private idb = inject(IndexedDBService);

	// #region Get / Set / Remove

	/**
	 * Get cached value by key. Returns null when expired.
	 */
	async getCache<T>(key: string): Promise<T | null> {
		const db = await this.idb.ensureDB();
		if (!db) return null;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(IDB_STORES.CACHE, 'readonly');
				const store = transaction.objectStore(IDB_STORES.CACHE);
				const request = store.get(key);

				request.onsuccess = () => {
					const record = request.result as CacheRecord<T> | undefined;
					if (record) {
						if (record.expiresAt && record.expiresAt < Date.now()) {
							this.removeCache(key);
							resolve(null);
						} else {
							resolve(record.value);
						}
					} else {
						resolve(null);
					}
				};

				request.onerror = () => resolve(null);
			} catch {
				resolve(null);
			}
		});
	}

	/**
	 * Store cached value with optional TTL.
	 */
	async setCache<T>(key: string, value: T, ttlMs?: number): Promise<void> {
		const db = await this.idb.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(IDB_STORES.CACHE, 'readwrite');
				const store = transaction.objectStore(IDB_STORES.CACHE);

				const record: CacheRecord<T> = {
					key,
					value,
					expiresAt: ttlMs ? Date.now() + ttlMs : null,
					createdAt: Date.now(),
				};

				store.put(record);

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	/**
	 * Remove cached value by key.
	 */
	async removeCache(key: string): Promise<void> {
		const db = await this.idb.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(IDB_STORES.CACHE, 'readwrite');
				const store = transaction.objectStore(IDB_STORES.CACHE);
				store.delete(key);

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	// #endregion
	// #region Cleanup

	/**
	 * Clear expired cache entries using the expiresAt index.
	 */
	async clearExpiredCache(): Promise<void> {
		const db = await this.idb.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(IDB_STORES.CACHE, 'readwrite');
				const store = transaction.objectStore(IDB_STORES.CACHE);
				const index = store.index('expiresAt');
				const now = Date.now();

				const request = index.openCursor(IDBKeyRange.upperBound(now));

				request.onsuccess = (event) => {
					const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
					if (cursor) {
						const record = cursor.value as CacheRecord<unknown>;
						if (record.expiresAt && record.expiresAt < now) {
							cursor.delete();
						}
						cursor.continue();
					}
				};

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	// #endregion
}
