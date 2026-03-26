import { Injectable, inject } from '@angular/core';
import { logger } from '@app/core/helpers';
import { IndexedDBService, IDB_STORES } from './indexed-db.service';
import { NotificationStorageData } from './storage.models';

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
 * Domain storage service for notification persistence in IndexedDB.
 */
@Injectable({
	providedIn: 'root',
})
export class NotificationStorageService {
	private idb = inject(IndexedDBService);

	// #region Dismissed notifications

	/**
	 * Get dismissed notification ids.
	 */
	async getDismissedNotifications(): Promise<NotificationStorageData | null> {
		return this.getNotificationRecord('dismissed');
	}

	/**
	 * Store dismissed notification ids.
	 */
	async setDismissedNotifications(data: NotificationStorageData): Promise<void> {
		return this.setNotificationRecord('dismissed', data);
	}

	/**
	 * Remove dismissed notification ids.
	 */
	async removeDismissedNotifications(): Promise<void> {
		return this.deleteNotificationRecord('dismissed');
	}

	// #endregion
	// #region Read notifications

	/**
	 * Get read notification ids.
	 */
	async getReadNotifications(): Promise<NotificationStorageData | null> {
		return this.getNotificationRecord('read');
	}

	/**
	 * Store read notification ids.
	 */
	async setReadNotifications(data: NotificationStorageData): Promise<void> {
		return this.setNotificationRecord('read', data);
	}

	/**
	 * Remove read notification ids.
	 */
	async removeReadNotifications(): Promise<void> {
		return this.deleteNotificationRecord('read');
	}

	// #endregion
	// #region Clear all

	/**
	 * Clear all notification records.
	 */
	async clearNotifications(): Promise<void> {
		const db = await this.idb.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(IDB_STORES.NOTIFICATIONS, 'readwrite');
				const store = transaction.objectStore(IDB_STORES.NOTIFICATIONS);
				store.clear();

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	// #endregion
	// #region Private helpers

	private async getNotificationRecord(
		type: 'dismissed' | 'read',
	): Promise<NotificationStorageData | null> {
		const db = await this.idb.ensureDB();
		if (!db) return null;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(IDB_STORES.NOTIFICATIONS, 'readonly');
				const store = transaction.objectStore(IDB_STORES.NOTIFICATIONS);
				const request = store.get(type);

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
						`[NotificationStorage] Error getting ${type} notifications:`,
						request.error,
					);
					resolve(null);
				};
			} catch (e) {
				logger.error('[NotificationStorage] Transaction error:', e);
				resolve(null);
			}
		});
	}

	private async setNotificationRecord(
		type: 'dismissed' | 'read',
		data: NotificationStorageData,
	): Promise<void> {
		const db = await this.idb.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(IDB_STORES.NOTIFICATIONS, 'readwrite');
				const store = transaction.objectStore(IDB_STORES.NOTIFICATIONS);

				const record: NotificationRecord = {
					id: type,
					type,
					notificationIds: data.ids,
					date: data.date,
					createdAt: Date.now(),
				};

				store.put(record);

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => {
					logger.error(
						`[NotificationStorage] Error saving ${type} notifications:`,
						transaction.error,
					);
					resolve();
				};
			} catch (e) {
				logger.error('[NotificationStorage] Transaction error:', e);
				resolve();
			}
		});
	}

	private async deleteNotificationRecord(type: 'dismissed' | 'read'): Promise<void> {
		const db = await this.idb.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(IDB_STORES.NOTIFICATIONS, 'readwrite');
				const store = transaction.objectStore(IDB_STORES.NOTIFICATIONS);
				store.delete(type);

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	// #endregion
}
