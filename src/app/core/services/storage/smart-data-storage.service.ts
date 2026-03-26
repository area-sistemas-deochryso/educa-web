import { Injectable, inject } from '@angular/core';
import { logger } from '@app/core/helpers';
import { IndexedDBService, IDB_STORES } from './indexed-db.service';
import { SmartDataRecord } from '@app/core/services/notifications/smart-notification.models';

/**
 * Domain storage service for smart notification data persistence in IndexedDB.
 */
@Injectable({
	providedIn: 'root',
})
export class SmartDataStorageService {
	private idb = inject(IndexedDBService);

	// #region Get / Set

	/**
	 * Get smart data record by entity id and type.
	 */
	async getSmartData(
		entityId: number,
		type: SmartDataRecord['type'],
	): Promise<SmartDataRecord | null> {
		const db = await this.idb.ensureDB();
		if (!db) return null;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(IDB_STORES.SMART_DATA, 'readonly');
				const store = transaction.objectStore(IDB_STORES.SMART_DATA);
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
		const db = await this.idb.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(IDB_STORES.SMART_DATA, 'readwrite');
				const store = transaction.objectStore(IDB_STORES.SMART_DATA);
				store.put(record);

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
	 * Delete smart data records older than the given week start.
	 */
	async cleanOldSmartData(currentWeekStart: string): Promise<void> {
		const db = await this.idb.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(IDB_STORES.SMART_DATA, 'readwrite');
				const store = transaction.objectStore(IDB_STORES.SMART_DATA);
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
		const db = await this.idb.ensureDB();
		if (!db) return;

		return new Promise((resolve) => {
			try {
				const transaction = db.transaction(IDB_STORES.SMART_DATA, 'readwrite');
				const store = transaction.objectStore(IDB_STORES.SMART_DATA);
				store.clear();

				transaction.oncomplete = () => resolve();
				transaction.onerror = () => resolve();
			} catch {
				resolve();
			}
		});
	}

	// #endregion
}
