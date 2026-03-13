import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@app/core/helpers';
import { NotificationStorageData } from './storage.models';
import { SmartDataRecord } from '@app/core/services/notifications/smart-notification.models';

/**
 * IndexedDB service for async persistence of larger or structured data.
 *
 * This service is used for notifications, smart notification data,
 * and cache data that can grow over time.
 *
 * @example
 * const data = await idb.getDismissedNotifications();
 */
const DB_NAME = 'EducaWebDB';
const DB_VERSION = 2;

/**
 * Object store names used by this database.
 */
const STORES = {
	NOTIFICATIONS: 'notifications',
	CACHE: 'cache',
	SMART_DATA: 'smart-data',
} as const;

/**
 * Stored notification record shape in IndexedDB.
 */
interface NotificationRecord {
	id: string;
	type: 'dismissed' | 'read';
	notificationIds: string[];
	date: string;
	createdAt: number;
}

/**
 * Generic cache record shape in IndexedDB.
 */
interface CacheRecord<T = unknown> {
	key: string;
	value: T;
	expiresAt: number | null;
	createdAt: number;
}

@Injectable({
	providedIn: 'root',
})
export class IndexedDBService {
	private platformId = inject(PLATFORM_ID);
	private db: IDBDatabase | null = null;
	private dbReady: Promise<boolean> | null = null;

	/**
	 * True when running in the browser.
	 *
	 * @example
	 * if (!this.isBrowser) return;
	 */
	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	constructor() {
		if (this.isBrowser) {
			this.dbReady = this.initDB();
		}
	}

	// #region INIT

	/**
	 * Initialize the IndexedDB database and object stores.
	 *
	 * @returns True if the database is available.
	 * @example
	 * const ok = await this.initDB();
	 */
	private initDB(): Promise<boolean> {
		return new Promise((resolve) => {
			if (!this.isBrowser || !('indexedDB' in window)) {
				logger.warn('[IndexedDB] Not available in this environment');
				resolve(false);
				return;
			}

			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => {
				logger.error('[IndexedDB] Error opening database:', request.error);
				resolve(false);
			};

			request.onsuccess = () => {
				this.db = request.result;
				logger.log('[IndexedDB] Database opened successfully');
				resolve(true);
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;

				if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
					const notifStore = db.createObjectStore(STORES.NOTIFICATIONS, {
						keyPath: 'id',
					});
					notifStore.createIndex('type', 'type', { unique: false });
					notifStore.createIndex('date', 'date', { unique: false });
				}

				if (!db.objectStoreNames.contains(STORES.CACHE)) {
					const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
					cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
				}

				if (!db.objectStoreNames.contains(STORES.SMART_DATA)) {
					const smartStore = db.createObjectStore(STORES.SMART_DATA, {
						keyPath: 'key',
					});
					smartStore.createIndex('entityId', 'entityId', { unique: false });
					smartStore.createIndex('weekStart', 'weekStart', { unique: false });
				}

				logger.log('[IndexedDB] Database upgraded to version', DB_VERSION);
			};
		});
	}

	/**
	 * Ensure the database is ready and return the instance.
	 *
	 * @returns Database instance or null.
	 * @example
	 * const db = await this.ensureDB();
	 */
	private async ensureDB(): Promise<IDBDatabase | null> {
		if (this.dbReady) {
			await this.dbReady;
		}
		return this.db;
	}

	// #endregion
	// #region NOTIFICATIONS

	/**
	 * Get dismissed notification ids.
	 *
	 * @returns Notification storage data or null.
	 * @example
	 * const data = await idb.getDismissedNotifications();
	 */
	async getDismissedNotifications(): Promise<NotificationStorageData | null> {
		const db = await this.ensureDB();
		if (!db) return null;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.NOTIFICATIONS, 'readonly');
				const store = transaction.objectStore(STORES.NOTIFICATIONS);
				const request = store.get('dismissed');

				request.onsuccess = () => {
					const record = request.result as NotificationRecord | undefined;
					if (record) {
						resolve({ ids: record.notificationIds, date: record.date });
					} else {
						resolve(null);
					}
				};

				request.onerror = () => {
					logger.error(
						'[IndexedDB] Error getting dismissed notifications:',
						request.error,
					);
					resolve(null);
				};
			} catch (e) {
				logger.error('[IndexedDB] Transaction error:', e);
				resolve(null);
			}
		});
	}

	/**
	 * Store dismissed notification ids.
	 *
	 * @param data Notification storage data.
	 * @example
	 * await idb.setDismissedNotifications({ ids: [1], date: '2025-01-01' });
	 */
	async setDismissedNotifications(data: NotificationStorageData): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.NOTIFICATIONS, 'readwrite');
				const store = transaction.objectStore(STORES.NOTIFICATIONS);

				const record: NotificationRecord = {
					id: 'dismissed',
					type: 'dismissed',
					notificationIds: data.ids,
					date: data.date,
					createdAt: Date.now(),
				};

				store.put(record);

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => {
					logger.error(
						'[IndexedDB] Error saving dismissed notifications:',
						transaction.error,
					);
					resolve();
				};
			} catch (e) {
				logger.error('[IndexedDB] Transaction error:', e);
				resolve();
			}
		});
	}

	/**
	 * Remove dismissed notification ids.
	 *
	 * @example
	 * await idb.removeDismissedNotifications();
	 */
	async removeDismissedNotifications(): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.NOTIFICATIONS, 'readwrite');
				const store = transaction.objectStore(STORES.NOTIFICATIONS);
				store.delete('dismissed');

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	/**
	 * Get read notification ids.
	 *
	 * @returns Notification storage data or null.
	 * @example
	 * const data = await idb.getReadNotifications();
	 */
	async getReadNotifications(): Promise<NotificationStorageData | null> {
		const db = await this.ensureDB();
		if (!db) return null;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.NOTIFICATIONS, 'readonly');
				const store = transaction.objectStore(STORES.NOTIFICATIONS);
				const request = store.get('read');

				request.onsuccess = () => {
					const record = request.result as NotificationRecord | undefined;
					if (record) {
						resolve({ ids: record.notificationIds, date: record.date });
					} else {
						resolve(null);
					}
				};

				request.onerror = () => {
					logger.error('[IndexedDB] Error getting read notifications:', request.error);
					resolve(null);
				};
			} catch {
				resolve(null);
			}
		});
	}

	/**
	 * Store read notification ids.
	 *
	 * @param data Notification storage data.
	 * @example
	 * await idb.setReadNotifications({ ids: [1], date: '2025-01-01' });
	 */
	async setReadNotifications(data: NotificationStorageData): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.NOTIFICATIONS, 'readwrite');
				const store = transaction.objectStore(STORES.NOTIFICATIONS);

				const record: NotificationRecord = {
					id: 'read',
					type: 'read',
					notificationIds: data.ids,
					date: data.date,
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
	 * Remove read notification ids.
	 *
	 * @example
	 * await idb.removeReadNotifications();
	 */
	async removeReadNotifications(): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.NOTIFICATIONS, 'readwrite');
				const store = transaction.objectStore(STORES.NOTIFICATIONS);
				store.delete('read');

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	/**
	 * Clear all notification records.
	 *
	 * @example
	 * await idb.clearNotifications();
	 */
	async clearNotifications(): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.NOTIFICATIONS, 'readwrite');
				const store = transaction.objectStore(STORES.NOTIFICATIONS);
				store.clear();

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	// #endregion
	// #region CACHE

	/**
	 * Get cached value by key.
	 *
	 * @param key Cache key.
	 * @returns Cached value or null.
	 * @example
	 * const value = await idb.getCache<string>('app_config');
	 */
	async getCache<T>(key: string): Promise<T | null> {
		const db = await this.ensureDB();
		if (!db) return null;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.CACHE, 'readonly');
				const store = transaction.objectStore(STORES.CACHE);
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
	 *
	 * @param key Cache key.
	 * @param value Value to store.
	 * @param ttlMs Optional time to live in ms.
	 * @example
	 * await idb.setCache('app_config', config, 60000);
	 */
	async setCache<T>(key: string, value: T, ttlMs?: number): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.CACHE, 'readwrite');
				const store = transaction.objectStore(STORES.CACHE);

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
	 *
	 * @param key Cache key.
	 * @example
	 * await idb.removeCache('app_config');
	 */
	async removeCache(key: string): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.CACHE, 'readwrite');
				const store = transaction.objectStore(STORES.CACHE);
				store.delete(key);

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	/**
	 * Clear expired cache entries using the expiresAt index.
	 *
	 * @example
	 * await idb.clearExpiredCache();
	 */
	async clearExpiredCache(): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.CACHE, 'readwrite');
				const store = transaction.objectStore(STORES.CACHE);
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
	// #region SMART DATA

	/**
	 * Get smart data record by key.
	 */
	async getSmartData(entityId: number, type: SmartDataRecord['type']): Promise<SmartDataRecord | null> {
		const db = await this.ensureDB();
		if (!db) return null;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.SMART_DATA, 'readonly');
				const store = transaction.objectStore(STORES.SMART_DATA);
				const request = store.get(`${entityId}:${type}`);

				request.onsuccess = () => resolve(request.result ?? null);
				request.onerror = () => resolve(null);
			} catch {
				resolve(null);
			}
		});
	}

	/**
	 * Save smart data record.
	 */
	async setSmartData(record: SmartDataRecord): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.SMART_DATA, 'readwrite');
				const store = transaction.objectStore(STORES.SMART_DATA);
				store.put(record);

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	/**
	 * Delete smart data records older than the given week start.
	 */
	async cleanOldSmartData(currentWeekStart: string): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.SMART_DATA, 'readwrite');
				const store = transaction.objectStore(STORES.SMART_DATA);
				const request = store.openCursor();

				request.onsuccess = (event) => {
					const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
					if (cursor) {
						const record = cursor.value as SmartDataRecord;
						if (record.weekStart < currentWeekStart) {
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

	/**
	 * Clear all smart data records.
	 */
	async clearSmartData(): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.SMART_DATA, 'readwrite');
				const store = transaction.objectStore(STORES.SMART_DATA);
				store.clear();

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	// #endregion
	// #region UTILITIES

	/**
	 * Clear notifications and expired cache entries.
	 *
	 * @example
	 * await idb.clearAll();
	 */
	async clearAll(): Promise<void> {
		await Promise.all([this.clearNotifications(), this.clearExpiredCache()]);
	}

	/**
	 * Check whether the database is available.
	 *
	 * @returns True if ready.
	 * @example
	 * const ok = await idb.isAvailable();
	 */
	async isAvailable(): Promise<boolean> {
		if (this.dbReady) {
			return await this.dbReady;
		}
		return false;
	}
	// #endregion
}
