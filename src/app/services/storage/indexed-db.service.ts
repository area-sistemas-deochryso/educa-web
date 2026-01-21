import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@app/helpers';
import { NotificationStorageData } from './storage.models';

/**
 * IndexedDBService - Para datos complejos que requieren persistencia offline
 *
 * Ideal para:
 * - Datos que necesitan consultas complejas
 * - Grandes volúmenes de datos estructurados
 * - Aplicaciones offline-first
 * - Datos que pueden crecer con el tiempo
 *
 * Ventajas:
 * - Almacenamiento asíncrono (no bloquea UI)
 * - Soporta índices y consultas
 * - Mayor capacidad que localStorage
 * - Transacciones ACID
 */

const DB_NAME = 'EducaWebDB';
const DB_VERSION = 1;

const STORES = {
	NOTIFICATIONS: 'notifications',
	CACHE: 'cache',
} as const;

interface NotificationRecord {
	id: string;
	type: 'dismissed' | 'read';
	notificationIds: string[];
	date: string;
	createdAt: number;
}

interface CacheRecord {
	key: string;
	value: any;
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

	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	constructor() {
		if (this.isBrowser) {
			this.dbReady = this.initDB();
		}
	}

	// ============================================
	// INICIALIZACIÓN
	// ============================================

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

				// Store para notificaciones
				if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
					const notifStore = db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id' });
					notifStore.createIndex('type', 'type', { unique: false });
					notifStore.createIndex('date', 'date', { unique: false });
				}

				// Store para cache general
				if (!db.objectStoreNames.contains(STORES.CACHE)) {
					const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
					cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
				}

				logger.log('[IndexedDB] Database upgraded to version', DB_VERSION);
			};
		});
	}

	private async ensureDB(): Promise<IDBDatabase | null> {
		if (this.dbReady) {
			await this.dbReady;
		}
		return this.db;
	}

	// ============================================
	// NOTIFICATIONS
	// ============================================

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
					logger.error('[IndexedDB] Error getting dismissed notifications:', request.error);
					resolve(null);
				};
			} catch (e) {
				logger.error('[IndexedDB] Transaction error:', e);
				resolve(null);
			}
		});
	}

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
					logger.error('[IndexedDB] Error saving dismissed notifications:', transaction.error);
					resolve();
				};
			} catch (e) {
				logger.error('[IndexedDB] Transaction error:', e);
				resolve();
			}
		});
	}

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
			} catch (e) {
				resolve();
			}
		});
	}

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
			} catch (e) {
				resolve(null);
			}
		});
	}

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
			} catch (e) {
				resolve();
			}
		});
	}

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
			} catch (e) {
				resolve();
			}
		});
	}

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
			} catch (e) {
				resolve();
			}
		});
	}

	// ============================================
	// CACHE GENERAL (para datos que expiran)
	// ============================================

	async getCache<T>(key: string): Promise<T | null> {
		const db = await this.ensureDB();
		if (!db) return null;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.CACHE, 'readonly');
				const store = transaction.objectStore(STORES.CACHE);
				const request = store.get(key);

				request.onsuccess = () => {
					const record = request.result as CacheRecord | undefined;
					if (record) {
						// Verificar expiración
						if (record.expiresAt && record.expiresAt < Date.now()) {
							this.removeCache(key);
							resolve(null);
						} else {
							resolve(record.value as T);
						}
					} else {
						resolve(null);
					}
				};

				request.onerror = () => resolve(null);
			} catch (e) {
				resolve(null);
			}
		});
	}

	async setCache<T>(key: string, value: T, ttlMs?: number): Promise<void> {
		const db = await this.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(STORES.CACHE, 'readwrite');
				const store = transaction.objectStore(STORES.CACHE);

				const record: CacheRecord = {
					key,
					value,
					expiresAt: ttlMs ? Date.now() + ttlMs : null,
					createdAt: Date.now(),
				};

				store.put(record);

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch (e) {
				resolve();
			}
		});
	}

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
			} catch (e) {
				resolve();
			}
		});
	}

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
						const record = cursor.value as CacheRecord;
						if (record.expiresAt && record.expiresAt < now) {
							cursor.delete();
						}
						cursor.continue();
					}
				};

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch (e) {
				resolve();
			}
		});
	}

	// ============================================
	// UTILIDADES
	// ============================================

	async clearAll(): Promise<void> {
		await Promise.all([this.clearNotifications(), this.clearExpiredCache()]);
	}

	async isAvailable(): Promise<boolean> {
		if (this.dbReady) {
			return await this.dbReady;
		}
		return false;
	}
}
