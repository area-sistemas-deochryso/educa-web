const DB_NAME = 'educa-error-outbox';
const STORE_NAME = 'pending';
const DB_VERSION = 1;
export const MAX_PENDING = 50;

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

function idbTransaction(tx: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

/** Save a report to the offline outbox. Silently drops if IDB unavailable or outbox full. */
export async function saveReportToOutbox<T>(payload: T): Promise<void> {
	try {
		const db = await openDb();
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);
		const count = await idbRequest<number>(store.count());
		if (count >= MAX_PENDING) {
			db.close();
			return;
		}
		store.add(payload);
		await idbTransaction(tx);
		db.close();
	} catch {
		// IDB unavailable
	}
}

/** Read all pending reports with their keys. Empty array if IDB unavailable. */
export async function readPendingReports<T>(): Promise<{ key: number; value: T }[]> {
	try {
		const db = await openDb();
		const tx = db.transaction(STORE_NAME, 'readonly');
		const store = tx.objectStore(STORE_NAME);
		const keys = await idbRequest<IDBValidKey[]>(store.getAllKeys());
		const values = await idbRequest<T[]>(store.getAll());
		db.close();
		return keys.map((k, i) => ({ key: k as number, value: values[i] }));
	} catch {
		return [];
	}
}

/** Remove a sent report from the outbox. */
export async function removeReportFromOutbox(key: number): Promise<void> {
	try {
		const db = await openDb();
		const tx = db.transaction(STORE_NAME, 'readwrite');
		tx.objectStore(STORE_NAME).delete(key);
		await idbTransaction(tx);
		db.close();
	} catch {
		// Ignore
	}
}
