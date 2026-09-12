// * Tests for WalStorageIndexedDbStrategy — init failure paths (M3).
// jsdom does not implement IndexedDB; happy-path coverage lives at the
// facade level (`WalDbService`) via the in-memory fallback.
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WalStorageIndexedDbStrategy } from './wal-storage-indexeddb.strategy';

interface FakeRequest {
	result: unknown;
	error: Error | null;
	onsuccess: ((ev: Event) => void) | null;
	onerror: ((ev: Event) => void) | null;
	onblocked: ((ev: Event) => void) | null;
	onupgradeneeded: ((ev: Event) => void) | null;
}

function makeRequest(): FakeRequest {
	return {
		result: null,
		error: null,
		onsuccess: null,
		onerror: null,
		onblocked: null,
		onupgradeneeded: null,
	};
}

interface FakeTx {
	objectStore: () => { put: (v: unknown) => void };
	error: Error | null;
	oncomplete: (() => void) | null;
	onerror: (() => void) | null;
}

function makeFakeDb(): { db: { transaction: () => FakeTx }; tx: FakeTx } {
	const tx: FakeTx = {
		objectStore: () => ({ put: () => {} }),
		error: null,
		oncomplete: null,
		onerror: null,
	};
	return { db: { transaction: () => tx }, tx };
}

function makeEntry() {
	return {
		id: 'x',
		timestamp: 0,
		operation: 'UPDATE' as const,
		resourceType: 'horarios',
		endpoint: '/api/x',
		method: 'PUT',
		payload: {},
		status: 'PENDING' as const,
		retries: 0,
		maxRetries: 2,
	};
}

async function initWithFakeDb(strategy: WalStorageIndexedDbStrategy) {
	const req = makeRequest();
	const { db, tx } = makeFakeDb();
	(globalThis as { indexedDB?: { open: () => unknown } }).indexedDB = {
		open: vi.fn(() => req),
	};
	const ready = strategy.init();
	req.result = db;
	req.onsuccess?.(new Event('success'));
	await ready;
	return tx;
}

const originalIndexedDB = (globalThis as { indexedDB?: unknown }).indexedDB;

describe('WalStorageIndexedDbStrategy', () => {
	let strategy: WalStorageIndexedDbStrategy;

	beforeEach(() => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({ providers: [WalStorageIndexedDbStrategy] });
		strategy = TestBed.inject(WalStorageIndexedDbStrategy);
	});

	afterEach(() => {
		(globalThis as { indexedDB?: unknown }).indexedDB = originalIndexedDB;
		vi.restoreAllMocks();
	});

	it('reports persistent mode', () => {
		expect(strategy.mode).toBe('persistent');
	});

	it('init resolves false when indexedDB global is missing', async () => {
		(globalThis as { indexedDB?: unknown }).indexedDB = undefined;
		await expect(strategy.init()).resolves.toBe(false);
	});

	it('init resolves false when indexedDB.open errors', async () => {
		const req = makeRequest();
		(globalThis as { indexedDB?: { open: () => unknown } }).indexedDB = {
			open: vi.fn(() => req),
		};

		const ready = strategy.init();
		// Fire onerror after the promise is awaited
		req.error = new Error('boom');
		req.onerror?.(new Event('error'));

		await expect(ready).resolves.toBe(false);
	});

	it('init resolves false when indexedDB.open is blocked', async () => {
		const req = makeRequest();
		(globalThis as { indexedDB?: { open: () => unknown } }).indexedDB = {
			open: vi.fn(() => req),
		};

		const ready = strategy.init();
		req.onblocked?.(new Event('blocked'));

		await expect(ready).resolves.toBe(false);
	});

	it('init resolves false when indexedDB.open throws synchronously', async () => {
		(globalThis as { indexedDB?: { open: () => unknown } }).indexedDB = {
			open: vi.fn(() => {
				throw new Error('synchronous error');
			}),
		};
		await expect(strategy.init()).resolves.toBe(false);
	});

	it('reads return safe defaults before init succeeds', async () => {
		expect(await strategy.get('any')).toBeUndefined();
		expect(await strategy.getByStatus('PENDING')).toEqual([]);
		expect(await strategy.getAll()).toEqual([]);
		expect(await strategy.count()).toBe(0);
		expect(await strategy.hasActiveByResourceType('horarios')).toBe(false);
	});

	it('writes are no-ops when db is not initialized', async () => {
		await expect(
			strategy.put({
				id: 'x',
				timestamp: 0,
				operation: 'UPDATE',
				resourceType: 'horarios',
				endpoint: '/api/x',
				method: 'PUT',
				payload: {},
				status: 'PENDING',
				retries: 0,
				maxRetries: 2,
			}),
		).resolves.toBeUndefined();
		await expect(strategy.delete('x')).resolves.toBeUndefined();
		await expect(strategy.clear()).resolves.toBeUndefined();
		expect(await strategy.deleteCommittedOlderThan(0)).toBe(0);
		expect(await strategy.purgeByResourceType('horarios')).toBe(0);
	});

	it('put rejects on a non-quota transaction error instead of swallowing it (F1 point 3)', async () => {
		const tx = await initWithFakeDb(strategy);

		const putPromise = strategy.put(makeEntry());
		tx.error = new Error('generic io error');
		tx.onerror?.();

		await expect(putPromise).rejects.toThrow('generic io error');
	});

	it('put still rejects on QuotaExceededError (deliberate fallback signal)', async () => {
		const tx = await initWithFakeDb(strategy);

		const putPromise = strategy.put(makeEntry());
		const quotaError = new Error('quota exceeded');
		quotaError.name = 'QuotaExceededError';
		tx.error = quotaError;
		tx.onerror?.();

		await expect(putPromise).rejects.toThrow('quota exceeded');
	});
});
