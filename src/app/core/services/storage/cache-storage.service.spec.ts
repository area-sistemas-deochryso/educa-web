// #region Imports
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CacheStorageService } from './cache-storage.service';
import { IndexedDBService } from './indexed-db.service';
// #endregion

// #region Fake IndexedDB
interface Rec {
	key: string;
	value: unknown;
	expiresAt: number | null;
	createdAt: number;
}

/** Fake mínimo de IDBDatabase con un único object store en memoria. Las requests resuelven en microtask. */
function createFakeDb(initial: Rec[] = []) {
	const records = new Map<string, Rec>(initial.map((r) => [r.key, r]));
	const cursorDeletes: string[] = [];
	const state = { failTransaction: false, failGet: false };

	const db = {
		transaction: () => {
			if (state.failTransaction) throw new Error('tx boom');
			const tx: { oncomplete?: () => void; onerror?: () => void } = {};
			const finish = () => queueMicrotask(() => tx.oncomplete?.());

			const store = {
				get: (key: string) => {
					const request: { result?: Rec; onsuccess?: () => void; onerror?: () => void } = {};
					queueMicrotask(() => {
						if (state.failGet) return request.onerror?.();
						request.result = records.get(key);
						request.onsuccess?.();
					});
					return request;
				},
				put: (rec: Rec) => {
					records.set(rec.key, rec);
					finish();
				},
				delete: (key: string) => {
					records.delete(key);
					finish();
				},
				index: () => ({
					openCursor: () => {
						const request: { onsuccess?: (e: unknown) => void } = {};
						const pending = [...records.values()].filter((r) => r.expiresAt !== null);
						queueMicrotask(() => {
							for (const rec of pending) {
								request.onsuccess?.({
									target: {
										result: {
											value: rec,
											delete: () => {
												cursorDeletes.push(rec.key);
												records.delete(rec.key);
											},
											continue: () => undefined,
										},
									},
								});
							}
							request.onsuccess?.({ target: { result: null } });
							finish();
						});
						return request;
					},
				}),
			};
			return Object.assign(tx, { objectStore: () => store });
		},
	};

	return { db, records, cursorDeletes, state };
}
// #endregion

// #region Tests
describe('CacheStorageService', () => {
	let service: CacheStorageService;
	let fake: ReturnType<typeof createFakeDb>;
	let ensureDB: ReturnType<typeof vi.fn>;

	function setup(initial: Rec[] = [], dbAvailable = true) {
		fake = createFakeDb(initial);
		ensureDB = vi.fn().mockResolvedValue(dbAvailable ? fake.db : null);
		TestBed.configureTestingModule({
			providers: [{ provide: IndexedDBService, useValue: { ensureDB } }],
		});
		service = TestBed.inject(CacheStorageService);
	}

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-03-01T00:00:00Z'));
	});

	afterEach(() => vi.useRealTimers());

	describe('sin IndexedDB disponible', () => {
		beforeEach(() => setup([], false));

		it('getCache devuelve null', async () => {
			expect(await service.getCache('k')).toBeNull();
		});

		it('setCache, removeCache y clearExpiredCache no lanzan', async () => {
			await expect(service.setCache('k', 1)).resolves.toBeUndefined();
			await expect(service.removeCache('k')).resolves.toBeUndefined();
			await expect(service.clearExpiredCache()).resolves.toBeUndefined();
		});
	});

	describe('setCache / getCache', () => {
		beforeEach(() => setup());

		it('guarda y recupera un valor sin TTL (expiresAt null)', async () => {
			await service.setCache('k', { a: 1 });
			expect(fake.records.get('k')?.expiresAt).toBeNull();
			expect(await service.getCache('k')).toEqual({ a: 1 });
		});

		it('con TTL calcula expiresAt = ahora + ttl', async () => {
			await service.setCache('k', 'v', 5_000);
			expect(fake.records.get('k')?.expiresAt).toBe(Date.now() + 5_000);
			expect(fake.records.get('k')?.createdAt).toBe(Date.now());
		});

		it('clave inexistente → null', async () => {
			expect(await service.getCache('nope')).toBeNull();
		});

		it('valor vigente (TTL no vencido) se devuelve', async () => {
			await service.setCache('k', 'v', 5_000);
			vi.setSystemTime(Date.now() + 4_999);
			expect(await service.getCache('k')).toBe('v');
		});

		it('valor vencido → null y se elimina del store', async () => {
			await service.setCache('k', 'v', 5_000);
			vi.setSystemTime(Date.now() + 5_001);
			expect(await service.getCache('k')).toBeNull();
			await Promise.resolve();
			expect(fake.records.has('k')).toBe(false);
		});

		it('un error en la request de lectura devuelve null', async () => {
			fake.state.failGet = true;
			expect(await service.getCache('k')).toBeNull();
		});

		it('una transacción que lanza devuelve null en lectura y no lanza en escritura', async () => {
			fake.state.failTransaction = true;
			expect(await service.getCache('k')).toBeNull();
			await expect(service.setCache('k', 1)).resolves.toBeUndefined();
			await expect(service.removeCache('k')).resolves.toBeUndefined();
		});
	});

	describe('removeCache', () => {
		it('elimina la clave', async () => {
			setup([{ key: 'k', value: 1, expiresAt: null, createdAt: 0 }]);
			await service.removeCache('k');
			expect(fake.records.has('k')).toBe(false);
		});
	});

	describe('clearExpiredCache', () => {
		beforeEach(() => vi.stubGlobal('IDBKeyRange', { upperBound: (v: number) => v }));
		afterEach(() => vi.unstubAllGlobals());

		it('borra solo las entradas con expiresAt vencido', async () => {
			const now = Date.now();
			setup([
				{ key: 'old', value: 1, expiresAt: now - 1, createdAt: 0 },
				{ key: 'fresh', value: 2, expiresAt: now + 10_000, createdAt: 0 },
				{ key: 'forever', value: 3, expiresAt: null, createdAt: 0 },
			]);
			await service.clearExpiredCache();
			expect(fake.cursorDeletes).toEqual(['old']);
			expect([...fake.records.keys()].sort()).toEqual(['forever', 'fresh']);
		});

		it('no lanza si la transacción falla', async () => {
			setup();
			fake.state.failTransaction = true;
			await expect(service.clearExpiredCache()).resolves.toBeUndefined();
		});
	});
});
// #endregion
