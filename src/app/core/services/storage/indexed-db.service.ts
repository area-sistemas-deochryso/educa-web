import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@app/core/helpers';

/**
 * Core IndexedDB service — database init, schema management and generic helpers.
 *
 * Domain-specific operations live in dedicated services:
 * - NotificationStorageService  (notifications store)
 * - CacheStorageService         (cache store)
 * - SmartDataStorageService     (smart-data store)
 */
const DB_NAME = 'EducaWebDB';
const DB_VERSION = 2;

/**
 * Object store names used by this database.
 */
export const IDB_STORES = {
	NOTIFICATIONS: 'notifications',
	CACHE: 'cache',
	SMART_DATA: 'smart-data',
} as const;

@Injectable({
	providedIn: 'root',
})
export class IndexedDBService {
	private platformId = inject(PLATFORM_ID);
	private db: IDBDatabase | null = null;
	private dbReady: Promise<boolean> | null = null;

	// #region Init

	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	constructor() {
		if (this.isBrowser) {
			this.dbReady = this.initDB();
		}
	}

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

				if (!db.objectStoreNames.contains(IDB_STORES.NOTIFICATIONS)) {
					const notifStore = db.createObjectStore(IDB_STORES.NOTIFICATIONS, {
						keyPath: 'id',
					});
					notifStore.createIndex('type', 'type', { unique: false });
					notifStore.createIndex('date', 'date', { unique: false });
				}

				if (!db.objectStoreNames.contains(IDB_STORES.CACHE)) {
					const cacheStore = db.createObjectStore(IDB_STORES.CACHE, { keyPath: 'key' });
					cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
				}

				if (!db.objectStoreNames.contains(IDB_STORES.SMART_DATA)) {
					const smartStore = db.createObjectStore(IDB_STORES.SMART_DATA, {
						keyPath: 'key',
					});
					smartStore.createIndex('entityId', 'entityId', { unique: false });
					smartStore.createIndex('weekStart', 'weekStart', { unique: false });
				}

				logger.log('[IndexedDB] Database upgraded to version', DB_VERSION);
			};
		});
	}

	// #endregion
	// #region Public helpers

	/**
	 * Ensure the database is ready and return the instance.
	 * Used by domain-specific storage services.
	 */
	async ensureDB(): Promise<IDBDatabase | null> {
		if (this.dbReady) {
			await this.dbReady;
		}
		return this.db;
	}

	/**
	 * Check whether the database is available.
	 */
	async isAvailable(): Promise<boolean> {
		if (this.dbReady) {
			return await this.dbReady;
		}
		return false;
	}

	// #endregion
}
