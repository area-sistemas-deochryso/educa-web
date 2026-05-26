import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WalCoalescer } from './wal-coalescer.service';
import { WalService } from './wal.service';
import { WalMetricsService } from './wal-metrics.service';
import { WalEntry } from './models';

function makeEntry(overrides: Partial<WalEntry> = {}): WalEntry {
	return {
		id: crypto.randomUUID(),
		timestamp: Date.now(),
		operation: 'UPDATE',
		resourceType: 'horarios',
		resourceId: 42,
		endpoint: '/api/horario/42',
		method: 'PUT',
		payload: { nombre: 'Test' },
		status: 'PENDING',
		retries: 0,
		maxRetries: 2,
		...overrides,
	};
}

describe('WalCoalescer', () => {
	let coalescer: WalCoalescer;
	let discardEntrySpy: ReturnType<typeof vi.fn>;
	let updatePayloadSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		discardEntrySpy = vi.fn().mockResolvedValue(undefined);
		updatePayloadSpy = vi.fn().mockResolvedValue(undefined);

		TestBed.configureTestingModule({
			providers: [
				WalCoalescer,
				{
					provide: WalService,
					useValue: {
						discardEntry: discardEntrySpy,
						updateEntryPayload: updatePayloadSpy,
					},
				},
				{
					provide: WalMetricsService,
					useValue: { recordCoalescence: vi.fn() },
				},
			],
		});

		coalescer = TestBed.inject(WalCoalescer);
	});

	it('returns entries unchanged when 0 or 1 entries', async () => {
		expect(await coalescer.coalesce([])).toEqual([]);

		const single = makeEntry();
		expect(await coalescer.coalesce([single])).toEqual([single]);
	});

	it('does not coalesce non-UPDATE operations', async () => {
		const create = makeEntry({ operation: 'CREATE', id: 'c1' });
		const del = makeEntry({ operation: 'DELETE', id: 'd1' });
		const toggle = makeEntry({ operation: 'TOGGLE', id: 't1' });

		const result = await coalescer.coalesce([create, del, toggle]);

		expect(result).toHaveLength(3);
		expect(discardEntrySpy).not.toHaveBeenCalled();
	});

	it('does not coalesce UPDATE entries with different resourceId', async () => {
		const a = makeEntry({ id: 'a', resourceId: 1, timestamp: 100 });
		const b = makeEntry({ id: 'b', resourceId: 2, timestamp: 200 });

		const result = await coalescer.coalesce([a, b]);

		expect(result).toHaveLength(2);
		expect(discardEntrySpy).not.toHaveBeenCalled();
	});

	it('keeps only the latest UPDATE per resource and discards older ones', async () => {
		const older = makeEntry({ id: 'old', resourceId: 42, timestamp: 100, payload: { a: 1 } });
		const newer = makeEntry({ id: 'new', resourceId: 42, timestamp: 200, payload: { b: 2 } });

		const result = await coalescer.coalesce([older, newer]);

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('new');
		expect(discardEntrySpy).toHaveBeenCalledWith('old');
	});

	it('shallow-merges payloads from older entries into the latest', async () => {
		const e1 = makeEntry({ id: 'e1', resourceId: 42, timestamp: 100, payload: { a: 1, b: 2 } });
		const e2 = makeEntry({ id: 'e2', resourceId: 42, timestamp: 200, payload: { b: 3, c: 4 } });

		await coalescer.coalesce([e1, e2]);

		expect(updatePayloadSpy).toHaveBeenCalledWith('e2', { a: 1, b: 3, c: 4 });
	});

	it('invokes cleanupCallback for each discarded entry', async () => {
		const e1 = makeEntry({ id: 'e1', resourceId: 42, timestamp: 100 });
		const e2 = makeEntry({ id: 'e2', resourceId: 42, timestamp: 200 });
		const e3 = makeEntry({ id: 'e3', resourceId: 42, timestamp: 300 });
		const callback = vi.fn();

		await coalescer.coalesce([e1, e2, e3], callback);

		expect(callback).toHaveBeenCalledWith('e1');
		expect(callback).toHaveBeenCalledWith('e2');
		expect(callback).toHaveBeenCalledTimes(2);
	});

	it('preserves non-UPDATE entries alongside coalesced UPDATEs', async () => {
		const create = makeEntry({ id: 'c1', operation: 'CREATE', resourceId: undefined, timestamp: 50 });
		const upd1 = makeEntry({ id: 'u1', resourceId: 42, timestamp: 100, payload: { x: 1 } });
		const upd2 = makeEntry({ id: 'u2', resourceId: 42, timestamp: 200, payload: { x: 2 } });
		const del = makeEntry({ id: 'd1', operation: 'DELETE', timestamp: 250 });

		const result = await coalescer.coalesce([create, upd1, upd2, del]);

		expect(result).toHaveLength(3);
		expect(result.map((e) => e.id)).toEqual(['c1', 'd1', 'u2']);
	});

	it('does not coalesce UPDATE entries without resourceId', async () => {
		const a = makeEntry({ id: 'a', resourceId: undefined, timestamp: 100 });
		const b = makeEntry({ id: 'b', resourceId: undefined, timestamp: 200 });

		const result = await coalescer.coalesce([a, b]);

		expect(result).toHaveLength(2);
		expect(discardEntrySpy).not.toHaveBeenCalled();
	});
});
