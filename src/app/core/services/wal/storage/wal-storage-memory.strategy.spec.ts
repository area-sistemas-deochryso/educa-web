// * Tests for WalStorageMemoryStrategy — contract + cap eviction (M3).
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { WalStorageMemoryStrategy, WAL_MEMORY_CAP } from './wal-storage-memory.strategy';
import { WalEntry } from '../models';

function makeEntry(id: string, overrides: Partial<WalEntry> = {}): WalEntry {
	return {
		id,
		timestamp: Date.now(),
		operation: 'UPDATE',
		resourceType: 'horarios',
		endpoint: '/api/horario/1',
		method: 'PUT',
		payload: { foo: 'bar' },
		status: 'PENDING',
		retries: 0,
		maxRetries: 2,
		...overrides,
	};
}

describe('WalStorageMemoryStrategy', () => {
	let strategy: WalStorageMemoryStrategy;

	beforeEach(() => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({ providers: [WalStorageMemoryStrategy] });
		strategy = TestBed.inject(WalStorageMemoryStrategy);
	});

	it('reports ephemeral mode', () => {
		expect(strategy.mode).toBe('ephemeral');
	});

	it('init resolves true synchronously', async () => {
		await expect(strategy.init()).resolves.toBe(true);
	});

	describe('contract: add → get → update → delete', () => {
		it('put then get returns the same entry', async () => {
			const e = makeEntry('a1');
			await strategy.put(e);
			expect(await strategy.get('a1')).toEqual(e);
		});

		it('put with same id overwrites (update)', async () => {
			const e = makeEntry('a1', { retries: 0 });
			await strategy.put(e);
			await strategy.put({ ...e, retries: 5 });
			const got = await strategy.get('a1');
			expect(got?.retries).toBe(5);
		});

		it('delete removes the entry', async () => {
			await strategy.put(makeEntry('a1'));
			await strategy.delete('a1');
			expect(await strategy.get('a1')).toBeUndefined();
		});

		it('get returns undefined for missing id', async () => {
			expect(await strategy.get('nope')).toBeUndefined();
		});
	});

	describe('queries', () => {
		beforeEach(async () => {
			await strategy.put(makeEntry('p1', { status: 'PENDING', timestamp: 30 }));
			await strategy.put(makeEntry('p2', { status: 'PENDING', timestamp: 10 }));
			await strategy.put(makeEntry('p3', { status: 'PENDING', timestamp: 20 }));
			await strategy.put(makeEntry('f1', { status: 'FAILED' }));
			await strategy.put(makeEntry('c1', { status: 'COMMITTED', committedAt: 5 }));
		});

		it('getByStatus returns FIFO by timestamp', async () => {
			const pending = await strategy.getByStatus('PENDING');
			expect(pending.map((e) => e.id)).toEqual(['p2', 'p3', 'p1']);
		});

		it('count without status returns total', async () => {
			expect(await strategy.count()).toBe(5);
		});

		it('count with status filters', async () => {
			expect(await strategy.count('PENDING')).toBe(3);
			expect(await strategy.count('FAILED')).toBe(1);
			expect(await strategy.count('COMMITTED')).toBe(1);
		});

		it('getAll returns every entry', async () => {
			const all = await strategy.getAll();
			expect(all).toHaveLength(5);
		});

		it('hasActiveByResourceType detects PENDING', async () => {
			expect(await strategy.hasActiveByResourceType('horarios')).toBe(true);
			expect(await strategy.hasActiveByResourceType('cursos')).toBe(false);
		});

		it('hasActiveByResourceType ignores COMMITTED/FAILED', async () => {
			await strategy.clear();
			await strategy.put(makeEntry('c1', { status: 'COMMITTED' }));
			await strategy.put(makeEntry('f1', { status: 'FAILED' }));
			expect(await strategy.hasActiveByResourceType('horarios')).toBe(false);
		});

		it('deleteCommittedOlderThan only touches COMMITTED entries', async () => {
			const removed = await strategy.deleteCommittedOlderThan(10);
			expect(removed).toBe(1);
			expect(await strategy.count()).toBe(4);
		});

		it('purgeByResourceType removes regardless of status', async () => {
			const removed = await strategy.purgeByResourceType('horarios');
			expect(removed).toBe(5);
			expect(await strategy.count()).toBe(0);
		});

		it('clear empties the store', async () => {
			await strategy.clear();
			expect(await strategy.count()).toBe(0);
		});
	});

	describe('memory cap', () => {
		it('evicts the oldest entry when inserting beyond WAL_MEMORY_CAP', async () => {
			for (let i = 0; i < WAL_MEMORY_CAP; i++) {
				await strategy.put(makeEntry(`k${i}`));
			}
			expect(await strategy.count()).toBe(WAL_MEMORY_CAP);

			await strategy.put(makeEntry('overflow'));

			expect(await strategy.count()).toBe(WAL_MEMORY_CAP);
			// The very first inserted key must be gone.
			expect(await strategy.get('k0')).toBeUndefined();
			expect(await strategy.get('overflow')).toBeDefined();
		});

		it('updating an existing key does not evict (no overflow)', async () => {
			for (let i = 0; i < WAL_MEMORY_CAP; i++) {
				await strategy.put(makeEntry(`k${i}`));
			}

			await strategy.put(makeEntry('k0', { retries: 9 }));

			expect(await strategy.count()).toBe(WAL_MEMORY_CAP);
			expect((await strategy.get('k0'))?.retries).toBe(9);
		});
	});
});
