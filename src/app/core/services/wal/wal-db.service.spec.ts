// * Tests for WalDbService — strategy selection + ephemeral fallback (M3).
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WalDbService } from './wal-db.service';
import { WalStatusStore } from './wal-status.store';
import { WalStorageIndexedDbStrategy } from './storage/wal-storage-indexeddb.strategy';
import { WalStorageMemoryStrategy } from './storage/wal-storage-memory.strategy';
import { WalEntry } from './models';

function makeEntry(id: string, overrides: Partial<WalEntry> = {}): WalEntry {
	return {
		id,
		timestamp: Date.now(),
		operation: 'UPDATE',
		resourceType: 'horarios',
		endpoint: '/api/horario/1',
		method: 'PUT',
		payload: {},
		status: 'PENDING',
		retries: 0,
		maxRetries: 2,
		...overrides,
	};
}

interface SetupOpts {
	indexedDbInit: () => Promise<boolean>;
}

function setup(opts: SetupOpts): {
	db: WalDbService;
	store: WalStatusStore;
	memory: WalStorageMemoryStrategy;
	indexedDbMock: { init: ReturnType<typeof vi.fn>; mode: 'persistent' };
} {
	TestBed.resetTestingModule();
	const indexedDbMock = {
		init: vi.fn(opts.indexedDbInit),
		mode: 'persistent' as const,
	};
	TestBed.configureTestingModule({
		providers: [
			WalDbService,
			WalStatusStore,
			WalStorageMemoryStrategy,
			{ provide: WalStorageIndexedDbStrategy, useValue: indexedDbMock },
		],
	});
	return {
		db: TestBed.inject(WalDbService),
		store: TestBed.inject(WalStatusStore),
		memory: TestBed.inject(WalStorageMemoryStrategy),
		indexedDbMock,
	};
}

describe('WalDbService', () => {
	beforeEach(() => {
		vi.useRealTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('strategy selection', () => {
		it('uses persistent strategy when IndexedDB resolves true', async () => {
			const { db, store } = setup({
				indexedDbInit: () => Promise.resolve(true),
			});
			await db.isAvailable();
			expect(store.mode()).toBe('persistent');
			expect(db.getMode()).toBe('persistent');
		});

		it('falls back to ephemeral when IndexedDB resolves false', async () => {
			const { db, store } = setup({
				indexedDbInit: () => Promise.resolve(false),
			});
			await db.isAvailable();
			expect(store.mode()).toBe('ephemeral');
			expect(db.getMode()).toBe('ephemeral');
		});

		it('falls back to ephemeral when IndexedDB init throws', async () => {
			const { db, store } = setup({
				indexedDbInit: () => Promise.reject(new Error('boom')),
			});
			await db.isAvailable();
			expect(store.mode()).toBe('ephemeral');
		});

		it('falls back to ephemeral when IndexedDB init exceeds the 5s timeout', async () => {
			vi.useFakeTimers();
			const { db, store } = setup({
				indexedDbInit: () => new Promise<boolean>(() => {}),
			});
			const ready = db.isAvailable();
			await vi.advanceTimersByTimeAsync(5_000);
			await ready;
			expect(store.mode()).toBe('ephemeral');
		});
	});

	describe('contract identical between strategies after fallback', () => {
		it('add → get → update → delete works in ephemeral mode', async () => {
			const { db, store } = setup({
				indexedDbInit: () => Promise.resolve(false),
			});
			await db.isAvailable();
			expect(store.mode()).toBe('ephemeral');

			await db.put(makeEntry('a1'));
			expect((await db.get('a1'))?.id).toBe('a1');

			await db.put(makeEntry('a1', { retries: 7 }));
			expect((await db.get('a1'))?.retries).toBe(7);

			await db.delete('a1');
			expect(await db.get('a1')).toBeUndefined();
		});

		it('getPending / getFailed / count delegate to the active strategy', async () => {
			const { db } = setup({
				indexedDbInit: () => Promise.resolve(false),
			});
			await db.isAvailable();
			await db.put(makeEntry('p1', { status: 'PENDING' }));
			await db.put(makeEntry('p2', { status: 'PENDING' }));
			await db.put(makeEntry('f1', { status: 'FAILED' }));

			expect(await db.getPending()).toHaveLength(2);
			expect(await db.getFailed()).toHaveLength(1);
			expect(await db.count()).toBe(3);
			expect(await db.count('PENDING')).toBe(2);
		});
	});
});
