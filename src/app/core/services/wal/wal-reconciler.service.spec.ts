// * Tests for WalReconciler — M1 orphaned commit reconciliation.
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WalReconciler } from './wal-reconciler.service';
import { SwService } from '@features/intranet/services/sw/sw.service';
import { WalEntry, WAL_CACHE_MAP } from './models';

function makeEntry(resourceType: string, id = 'r-1'): WalEntry {
	return {
		id,
		timestamp: Date.now(),
		operation: 'UPDATE',
		resourceType,
		resourceId: 1,
		endpoint: `/api/${resourceType}/1`,
		method: 'PUT',
		payload: {},
		status: 'COMMITTED',
		retries: 0,
		maxRetries: 5,
	};
}

interface SwMock {
	refetchByPattern: ReturnType<typeof vi.fn>;
}

function setup(): { reconciler: WalReconciler; sw: SwMock } {
	const sw: SwMock = {
		refetchByPattern: vi.fn().mockResolvedValue(0),
	};
	TestBed.configureTestingModule({
		providers: [WalReconciler, { provide: SwService, useValue: sw }],
	});
	return { reconciler: TestBed.inject(WalReconciler), sw };
}

describe('WalReconciler', () => {
	beforeEach(() => {
		TestBed.resetTestingModule();
		vi.clearAllMocks();
	});

	it('invokes sw.refetchByPattern for every pattern mapped to the resourceType', async () => {
		const { reconciler, sw } = setup();
		const entry = makeEntry('usuarios');
		const expectedPatterns = WAL_CACHE_MAP['usuarios'];
		expect(expectedPatterns.length).toBeGreaterThan(0);

		await reconciler.notifyOrphanedCommit(entry);

		expect(sw.refetchByPattern).toHaveBeenCalledTimes(expectedPatterns.length);
		for (const p of expectedPatterns) {
			expect(sw.refetchByPattern).toHaveBeenCalledWith(p);
		}
	});

	it('is a no-op (does not call refetchByPattern) when resourceType has no patterns', async () => {
		const { reconciler, sw } = setup();
		const entry = makeEntry('UnmappedType');
		// Sanity: WAL_CACHE_MAP must NOT have this resource
		expect(WAL_CACHE_MAP['UnmappedType']).toBeUndefined();

		await reconciler.notifyOrphanedCommit(entry);

		expect(sw.refetchByPattern).not.toHaveBeenCalled();
	});

	it('swallows refetch errors silently (cache invalidation already happened)', async () => {
		const { reconciler, sw } = setup();
		sw.refetchByPattern.mockRejectedValueOnce(new Error('SW gone'));
		const entry = makeEntry('horarios');

		await expect(reconciler.notifyOrphanedCommit(entry)).resolves.toBeUndefined();
	});
});
